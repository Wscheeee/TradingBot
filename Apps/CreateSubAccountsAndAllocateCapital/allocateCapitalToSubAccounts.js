//@ts-check
const {DecimalMath} = require("../../DecimalMath");
const { closeAllPositionsInASubAccount } = require("./closeAllPositionsInASubAccount");
const { markPositionsInDB_asClosedForATrader } = require("./markPositionsInDB_asClosedForATrader");

//locals
const { performUniversalTransfer } = require("./performUniversalTransfer");

/** 
 * @param {{
*      user: import("../../MongoDatabase/collections/users/types").Users_Collection_Document_Interface,
*      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
*      bybit: import("../../Trader").Bybit 
* }} param0
*/
module.exports.allocateCapitalToSubAccounts = async function allocateCapitalToSubAccounts({
    mongoDatabase,user,bybit
}){ 
    try {
        console.log("(fn:allocateCapitalToSubAccounts)");
        // 
        // await bybit.clients.bybit_RestClientV5.enableUniversalTransferForSubAccountsWithUIDs([String(user.),String(transactionLedger.fromUid)]);
        // Calculatte the acttual balances and the correct balances

        // Retrieve the subAccounts
        const userSubAccounts_Cursor = await mongoDatabase.collection.subAccountsCollection.getAllDocumentsBy({
            tg_user_id: user.tg_user_id,
            testnet: user.testnet,
        });
        const userSubAccounts_Array = await userSubAccounts_Cursor.toArray();

        // Get master account info
        const getMasterAccountAPIKeyInfo_Res = await bybit.clients.bybit_AccountAssetClientV3.getAPIKeyInformation();
        // console.log(getMasterAccountAPIKeyInfo_Res);
        //@ts-ignore
        if(getMasterAccountAPIKeyInfo_Res.retCode!==0)throw new Error("getMasterAccountAPIKeyInfo_Res: "+getMasterAccountAPIKeyInfo_Res.retMsg);
   
        // await enableUniversalTransferForSubAccounts({
        //     masterBybit:bybit,
        //     subAccountsUids: []
        // });
        //The account balancee of the master
        const masterAccountWalletBalance = await bybit.clients.bybit_AccountAssetClientV3.getUSDTDerivativesAccountWalletBalance();
        console.log({masterAccountWalletBalance});

        let totalAccountsBalance = masterAccountWalletBalance;
        /**
         * If difference is negative means that the account needs some money : If positive means the account can give some money
         * @type {{
         *      [accountName:string]:{
         *          balance: number
         *          difference:number,
         *          desiredBalance: number 
         *      }
         * }}
         */
        // Get the account balances of the sub accounts
        const accountUsernameToTheirDetailsObj = {};
        for(const subAccountDocument of userSubAccounts_Array){
            // login to subaccount and request balance
            const BybitSubClass = bybit.createNewBybitSubClass();
            const subAccount_bybit = new BybitSubClass({
                millisecondsToDelayBetweenRequests: 5000,
                privateKey: subAccountDocument.private_api,
                publicKey: subAccountDocument.public_api,
                testnet: subAccountDocument.testnet?true:false
            });
            const subAccountWalletBalance = await subAccount_bybit.clients.bybit_AccountAssetClientV3.getUSDTDerivativesAccountWalletBalance();
            totalAccountsBalance+=subAccountWalletBalance;
            accountUsernameToTheirDetailsObj[subAccountDocument.sub_account_username] = {
                balance: subAccountWalletBalance,
                desiredBalance:0,
                difference: 0
            };
        }

        console.log({accountUsernameToTheirDetailsObj});


        // Set disiredBalancce and difference
        // Retrieve the weight of each trader and calculate the correct capital for each account
        for (const subAccount of userSubAccounts_Array) {
            const weight = Number(subAccount.weight);
            const desiredBalance = totalAccountsBalance * weight;
            const accountBalance = accountUsernameToTheirDetailsObj[subAccount.sub_account_username].balance;
            // Calculate the difference between current and desired balances
            const accountDifference = accountBalance - desiredBalance;

            // set
            accountUsernameToTheirDetailsObj[subAccount.sub_account_username].difference = accountDifference;
            accountUsernameToTheirDetailsObj[subAccount.sub_account_username].desiredBalance = desiredBalance;
            // ut
            // accountUsernameToTheirDetailsObj[subAccount.sub_account_username].uid = Number(subAccount.sub_account_uid);
            
        }

        console.log({accountUsernameToTheirDetailsObj});
        

        // Make the adjustments :
        // Check if any account has a difference greater than 5%
        let adjustmentNeeded = false;
        for (const account of userSubAccounts_Array) {
            const {balance,difference} = accountUsernameToTheirDetailsObj[account.sub_account_username];
            const percentageDifference = Math.abs(difference / balance) * 100;

            if (percentageDifference > 5) {
                adjustmentNeeded = true;
                break;
            }
        }
        console.log({adjustmentNeeded});
        if(adjustmentNeeded){
            // Steep One: For all sub accounts with desired balance of 0: Close all their open orders/positions
            const SubAccountBybit = bybit.createNewBybitSubClass();
            for (const subUsername in accountUsernameToTheirDetailsObj){
                if(accountUsernameToTheirDetailsObj[subUsername].desiredBalance===0){
                    console.log("Closing open positions for subAccount:"+subUsername);
                    const subAccountDoc = userSubAccounts_Array.find((sub)=>sub.sub_account_username===subUsername);
                    if(!subAccountDoc) throw new Error(`sub username: ${subAccountDoc} not found`);
                    const subAccountBybit =  new SubAccountBybit({
                        millisecondsToDelayBetweenRequests: 5000,
                        privateKey:subAccountDoc.private_api,
                        publicKey:subAccountDoc.public_api,
                        testnet: user.testnet
                    });
                    await closeAllPositionsInASubAccount({
                        bybit:subAccountBybit
                    });
                    if(subAccountDoc.trader_uid){
                        await markPositionsInDB_asClosedForATrader({
                            mongoDatabase,
                            trader_uid:subAccountDoc.trader_uid
                        });
                    }

                


                }
            }
            // End of close open positions for subaccount with desired balance ===0



            /**
             * @typedef {{
             *      fromUid:number,
             *      toUid: number,
             *      amount: number
             * }} LedgerObject
             */
            /**
             * @type {LedgerObject[]}
             */
            const transactionsLedgersArray = [];
            /**
             * @type {LedgerObject[]}
             */
            const ledgerObj_Arrray = [];// Temp holds transactons in construuction
            /**
             * @type {LedgerObject}
             */
            let ledgerObj = {//Inittialize
                amount:0,
                fromUid:0,
                toUid:0
            };
            // Top up those accounts with negative difference with those accounts with positive difference
            for(const subAccount of userSubAccounts_Array){
                const subAccountInfoBalancesCalcsObj = accountUsernameToTheirDetailsObj[subAccount.sub_account_username];
                const {difference} = subAccountInfoBalancesCalcsObj;
                if(difference<0){//Means that the account needs some top up
                    ledgerObj.toUid = Number(subAccount.sub_account_uid);
                    ledgerObj.amount = Math.abs(difference);
                    ledgerObj_Arrray.push(ledgerObj);
                    ledgerObj = {// reset
                        amount:0,
                        fromUid:0,
                        toUid:0
                    };
                } 
            }
            console.log("ledgerObj_Arrray");
            console.log(ledgerObj_Arrray);
            if(ledgerObj_Arrray.length==0){
                // Meaning that no account has a negative balance
                // Send the excess change in subaccounts to master account
                for(const subAccount of userSubAccounts_Array){
                    const subAccountInfoBalancesCalcsObj = accountUsernameToTheirDetailsObj[subAccount.sub_account_username];
                    if(subAccountInfoBalancesCalcsObj && subAccountInfoBalancesCalcsObj.difference>0 && Number(subAccountInfoBalancesCalcsObj.difference.toFixed(2))>0.0){
                        
                        await performUniversalTransfer({
                            amount: String(new DecimalMath(subAccountInfoBalancesCalcsObj.difference).removeDecimals().getResult()),
                            toMemberId: Number(getMasterAccountAPIKeyInfo_Res.result.userID),
                            fromMemberId: Number(subAccount.sub_account_uid),
                            bybit,
                            masterBybit:bybit,
                            subAccountsUids:[String(subAccount.sub_account_uid)]
                        });
                    }
                }
                console.log("No money transfers");
                return;
            }
            const gettingMoneyFromSubAccounts = async ()=>{
                console.log(">gettingMoneyFromSubAccounts");

                for(const subAcccountToTakeMoneyFrom of userSubAccounts_Array){
                    const subAcccountToTakeMoneyFrom_InfoBalancesCalcsObj = accountUsernameToTheirDetailsObj[subAcccountToTakeMoneyFrom.sub_account_username];
                    const {difference: differenceOfSubAccountToTakeMoneyFrom} = subAcccountToTakeMoneyFrom_InfoBalancesCalcsObj;
                    const subAcountToTakeMoneyFrom_HasMoneyToGive = differenceOfSubAccountToTakeMoneyFrom>0;
                    console.log({differenceOfSubAccountToTakeMoneyFrom});
                    if(subAcountToTakeMoneyFrom_HasMoneyToGive){
                        let remainingChange = differenceOfSubAccountToTakeMoneyFrom;
                        // Give out all tthe amount possible
                        for(const ledgerObj_ of ledgerObj_Arrray){
                            const {amount,toUid} = ledgerObj_;
                            if(remainingChange>=1){
                                if(remainingChange<=amount){
                                    console.log("remainingChange<=amount",{remainingChange,amount});
                                    // transfer full amount
                                    transactionsLedgersArray.push({
                                        amount: remainingChange,
                                        fromUid: Number(subAcccountToTakeMoneyFrom.sub_account_uid),
                                        toUid: toUid
                                    });
                                    // Set remaining change to zero
                                    remainingChange = 0;
                                    //Update the ledger object
                                    ledgerObj_.amount = new DecimalMath(amount).subtract(remainingChange).getResult();

                                }else if(remainingChange>amount){
                                    console.log("remainingChange > amount",{remainingChange,amount});
                                    // remainingChange > amount 
                                    const amountToTransfer = amount;
                                    // transfer  amountToTransfer
                                    transactionsLedgersArray.push({
                                        amount: amountToTransfer,
                                        fromUid: Number(subAcccountToTakeMoneyFrom.sub_account_uid),
                                        toUid: toUid
                                    });
                                    //Update the ledger object
                                    ledgerObj_.amount = 0;
                                    // Set remaining change
                                    remainingChange = new DecimalMath(remainingChange).subtract(amountToTransfer).getResult();

                                }else {
                                    console.log("Passed",{remainingChange,amount});
                                }
                            }else {
                                console.log("remainingChange<$1 : so skipping",{remainingChange,amount});

                            }
                        }
                    }

                }




            };
            await gettingMoneyFromSubAccounts();
            const gettingMoneyFromMasterAccounts = ()=>{
                console.log(">gettingMoneyFromMasterAccounts");
                let remainingChange = masterAccountWalletBalance;
                console.log({masterAccountWalletBalance});
                for(const ledgerObj_ of  ledgerObj_Arrray){
                    if(remainingChange>0){
                        const {amount,toUid}  = ledgerObj_;
                        if(remainingChange<=amount){// Meaning the difference in account cannot fill in the required in "subAcccount to"
                            // Create a trransaction ledger to send the whole remaining change to the to account still.
                            transactionsLedgersArray.push({
                                amount: remainingChange,
                                fromUid: getMasterAccountAPIKeyInfo_Res.result.userID,
                                toUid: toUid
                            });
                            remainingChange = 0;
                        }else {
                            // the remainingChange > amount needed to "subAccount to"
                            // Take only what is needed
                            remainingChange =  new DecimalMath(remainingChange).subtract(amount).getResult();
                            transactionsLedgersArray.push({
                                amount: amount,
                                fromUid: getMasterAccountAPIKeyInfo_Res.result.userID,
                                toUid: toUid
                            });
                            
                        }
    
                    }

                }

            };
            gettingMoneyFromMasterAccounts();
            console.log({masterAccountWalletBalance});
            console.log("transactionsLedgersArray");
            console.log(transactionsLedgersArray);

            // it all transfers are less than 1 return
            const MINIMUM_AMOUUNT_TO_TRANSER = 1;
            const transfersListLength = transactionsLedgersArray.length;
            let numberOfTransfersWithAmountLessThanMin = 0;
            for(const transactionLedger of transactionsLedgersArray){
                if(transactionLedger.amount<MINIMUM_AMOUUNT_TO_TRANSER){
                    numberOfTransfersWithAmountLessThanMin+=1;
                }
            }

            if(transfersListLength===numberOfTransfersWithAmountLessThanMin){
                console.log("Amount to transfer in the ledger is less than minimum so not transferring anything",{MINIMUM_AMOUUNT_TO_TRANSER});
                return;
            }



            // // Make transfers
            for(const transactionLedger of transactionsLedgersArray){
                if(new DecimalMath(transactionLedger.amount).removeDecimals().getResult()>=1){
                    await performUniversalTransfer({
                        amount: String(new DecimalMath(transactionLedger.amount).removeDecimals().getResult()),
                        toMemberId: Number(transactionLedger.toUid),
                        fromMemberId: Number(transactionLedger.fromUid),
                        bybit,
                        masterBybit:bybit,
                        subAccountsUids:[String(transactionLedger.toUid),String(transactionLedger.fromUid)].filter((uid)=>uid!==String(getMasterAccountAPIKeyInfo_Res.result.userID))
                    });


                }
            }

        }else {
            return;
        }

        return await allocateCapitalToSubAccounts({
            bybit, mongoDatabase,user
        });
       
    }catch(error){
        const newErrorMessage = `(user:${user.tg_user_id}) (fn:allocateCapitalToSubAccounts):${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};



