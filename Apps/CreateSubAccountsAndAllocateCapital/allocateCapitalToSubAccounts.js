const {DecimalMath} = require("../../DecimalMath");
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
        // Calculatte the acttual balances and the correct balances

        // Retrieve the subAccounts
        const userSubAccounts_Cursor = await mongoDatabase.collection.subAccountsCollection.getAllDocumentsBy({
            tg_user_id: user.tg_user_id,
            testnet: user.testnet
        });
        const userSubAccounts_Array = await userSubAccounts_Cursor.toArray();

        // Get master account info
        const getMasterAccountAPIKeyInfo_Res = await bybit.clients.bybit_AccountAssetClientV3.getAPIKeyInformation();
        if(getMasterAccountAPIKeyInfo_Res.retCode!==0)throw new Error(getMasterAccountAPIKeyInfo_Res.retMsg);
        // Add master account to index 0 of userSubAccounts_Array


        //The account balancee of the master
        const masterAccountWalletBalance = await bybit.clients.bybit_AccountAssetClientV3.getUSDTDerivativesAccountWalletBalance();
        let totalAccountsBalance = masterAccountWalletBalance;
        /**
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
                balance: subAccountWalletBalance
            };
        }

        console.log({accountUsernameToTheirDetailsObj});



        // Retrieve the weight of each trader and calculate the correct capital for each account
        for (const subAccount of userSubAccounts_Array) {
            const weight = subAccount.weight;
            const desiredBalance = totalAccountsBalance * weight;
            const accountBalance = accountUsernameToTheirDetailsObj[subAccount.sub_account_username].balance;
            // Calculate the difference between current and desired balances
            const accountDifference = accountBalance - desiredBalance;

            // set
            accountUsernameToTheirDetailsObj[subAccount.sub_account_username].difference = accountDifference;
            accountUsernameToTheirDetailsObj[subAccount.sub_account_username].desiredBalance = desiredBalance;
            
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
            let ledgerObj = {};
            // Top up those accounts with negative difference with those accounts with positive difference
            for(const subAccount of userSubAccounts_Array){
                const subAccountInfoBalancesCalcsObj = accountUsernameToTheirDetailsObj[subAccount.sub_account_username];
                const {balance,desiredBalance,difference} = subAccountInfoBalancesCalcsObj;
                if(difference<0){//Means that the account needs some top up
                    ledgerObj.toUid = subAccount.sub_account_uid;
                    ledgerObj.amount = Math.abs(difference);
                    ledgerObj_Arrray.push(ledgerObj);
                    ledgerObj = {};
                }
            }
            console.log("ledgerObj_Arrray");
            console.log(ledgerObj_Arrray);
            if(ledgerObj_Arrray.length==0){
                // Meaning that no account has a negative balance
                // Send the ecess change in subaccounts to master account
                for(const subAccount of userSubAccounts_Array){
                    const subAccountInfoBalancesCalcsObj = accountUsernameToTheirDetailsObj[subAccount.sub_account_username];
                    if(subAccountInfoBalancesCalcsObj && subAccountInfoBalancesCalcsObj.difference>0 && subAccountInfoBalancesCalcsObj.difference.toFixed(2)>0.0){
                        await bybit.clients.bybit_RestClientV5.enableUniversalTransferForSubAccountsWithUIDs([String(getMasterAccountAPIKeyInfo_Res.result.userID),String(subAccount.sub_account_uid)]);
                        const createUniversalTransfer_Res = await bybit.clients.bybit_RestClientV5.createUniversalTransfer({
                            amount: String(subAccountInfoBalancesCalcsObj.difference.toFixed(2)),
                            coin:"USDT",
                            fromAccountType:"CONTRACT",
                            toAccountType:"CONTRACT",
                            toMemberId: Number(getMasterAccountAPIKeyInfo_Res.result.userID),
                            fromMemberId: Number(subAccount.sub_account_uid),
                            transferId: require("../../Utils/generateUID").generateUID()
                        });
                        if(createUniversalTransfer_Res.retCode!==0)throw new Error(createUniversalTransfer_Res.retMsg);
                    }
                }
                console.og("No money transfers");
                return;
            }
            const gettingMoneyFromSubAccounts = ()=>{
                console.log(">gettingMoneyFromSubAccounts");
                let indexCounter = 0;
                let subAcccountToTakeMoneyFrom = userSubAccounts_Array[indexCounter];
                let maxIndexOfSubAccountsArray = userSubAccounts_Array.length-1;
                while(subAcccountToTakeMoneyFrom!==null){
                    const subAccount = subAcccountToTakeMoneyFrom;
                    // (const subAccount of userSubAccounts_Array)
                    const subAccountInfoBalancesCalcsObj = accountUsernameToTheirDetailsObj[subAccount.sub_account_username];
                    const {balance,desiredBalance,difference} = subAccountInfoBalancesCalcsObj;
                    if(difference>0){//Means that the account needs some to top up another account with the excess
                        let remainingChange = difference;
                        ledgerObj_Arrray.forEach((ledgerObj_)=>{
                            const {amount,fromUid,toUid}  = ledgerObj_;
                            if(remainingChange<=amount){// Meaning the difference in account cannot fill in the required in "subAcccount to"
                                // Create a trransaction ledger to send the whole remaining change to the to account still.
                                transactionsLedgersArray.push({
                                    amount: remainingChange,
                                    fromUid: subAccount.sub_account_uid,
                                    toUid: toUid
                                });
                                // move to next index
                                indexCounter++;
                                if(indexCounter>maxIndexOfSubAccountsArray){
                                    subAcccountToTakeMoneyFrom = null;
                                }else {
                                    subAcccountToTakeMoneyFrom = userSubAccounts_Array[indexCounter];
    
                                }
                            }else {
                                // the remainingChange > amount needed to "subAccount to"
                                // Take only what is needed
                                remainingChange = new DecimalMath(remainingChange).subtract(amount);
                                transactionsLedgersArray.push({
                                    amount: amount,
                                    fromUid: subAccount.sub_account_uid,
                                    toUid: toUid
                                });
                                // Update the with the remaining change
                                accountUsernameToTheirDetailsObj[subAccount.sub_account_username].difference = remainingChange;
                                subAcccountToTakeMoneyFrom = subAccount;
                            }
                        });
    
                    }else {
                        // move to next index
                        indexCounter++;
                        if(indexCounter>maxIndexOfSubAccountsArray){
                            subAcccountToTakeMoneyFrom = null;
                        }else {
                            subAcccountToTakeMoneyFrom = userSubAccounts_Array[indexCounter];
    
                        }
                    }
                }

            };
            gettingMoneyFromSubAccounts();
            const gettingMoneyFromMasterAccounts = ()=>{
                console.log(">gettingMoneyFromMasterAccounts");
                let remainingChange = masterAccountWalletBalance;
                ledgerObj_Arrray.forEach((ledgerObj_)=>{
                    if(remainingChange>0){
                        const {amount,fromUid,toUid}  = ledgerObj_;
                        if(remainingChange<=amount){// Meaning the difference in account cannot fill in the required in "subAcccount to"
                            // Create a trransaction ledger to send the whole remaining change to the to account still.
                            transactionsLedgersArray.push({
                                amount: remainingChange,
                                fromUid: getMasterAccountAPIKeyInfo_Res.result.userID,
                                toUid: toUid
                            });
                        
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
                });

            };
            gettingMoneyFromMasterAccounts();
            console.log({masterAccountWalletBalance});
            console.log("transactionsLedgersArray");
            console.log(transactionsLedgersArray);


            // Make transfers
            for(const transactionLedger of transactionsLedgersArray){
                if(transactionLedger.amount.toFixed(2)>0.00){
                    // eneable universal transfer
                    await bybit.clients.bybit_RestClientV5.enableUniversalTransferForSubAccountsWithUIDs([String(transactionLedger.toUid),String(transactionLedger.fromUid)]);
                    const createUniversalTransfer_Res = await bybit.clients.bybit_RestClientV5.createUniversalTransfer({
                        amount: String(transactionLedger.amount.toFixed(2)),
                        coin:"USDT",
                        fromAccountType:"CONTRACT",
                        toAccountType:"CONTRACT",
                        toMemberId: Number(transactionLedger.toUid),
                        fromMemberId: Number(transactionLedger.fromUid),
                        transferId: require("../../Utils/generateUID").generateUID()
                    });
                    if(createUniversalTransfer_Res.retCode!==0)throw new Error(createUniversalTransfer_Res.retMsg);

                }
            }

        }
        return;
       
    }catch(error){
        const newErrorMessage = `(user:${user.tg_user_id}) (fn:allocateCapitalToSubAccounts):${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};



