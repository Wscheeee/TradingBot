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
        // Calculatte the acttual balances and the correct balances

        // Retrieve the subAccounts
        const userSubAccounts_Cursor = await mongoDatabase.collection.subAccountsCollection.getAllDocumentsBy({
            tg_user_id: user.tg_user_id
        });
        const userSubAccounts_Array = await userSubAccounts_Cursor.toArray();

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
        const accountUsernameToTheirDetailsObj = {};
        // Get the account balances of the sub accounts
        for(const subAccountDocument of userSubAccounts_Array){
            // login to subaccount and request balance
            const BybitSubClass = bybit.createNewBybitSubClass();
            const subAccount_bybit = new BybitSubClass({
                millisecondsToDelayBetweenRequests: 5000,
                privateKey: subAccountDocument.private_api,
                publicKey: subAccountDocument.puplic_api,
                testnet: subAccountDocument.testnet===false?false:true
            });
            const subAccountWalletBalance = subAccount_bybit.clients.bybit_AccountAssetClientV3.getUSDTDerivativesAccountWalletBalance();
            totalAccountsBalance+=subAccountWalletBalance;
            accountUsernameToTheirDetailsObj[subAccountDocument.name] = {
                balance: subAccountWalletBalance
            };
        }


        // Retrieve the weight of each trader and calculate the correct capital for each account
        for (const account of userSubAccounts_Array) {
            const weight = account.weight;
            const desiredBalance = totalAccountsBalance * weight;
            const accountBalance = accountUsernameToTheirDetailsObj[account.name].balance;
            // Calculate the difference between current and desired balances
            const accountDifference = accountBalance - desiredBalance;

            // set
            accountUsernameToTheirDetailsObj[account.name].difference = accountDifference;
            accountUsernameToTheirDetailsObj[account.name].desiredBalance = desiredBalance;
            
        }
        

        // Make the adjustments :
        // Check if any account has a difference greater than 5%
        let adjustmentNeeded = false;
        for (const account of userSubAccounts_Array) {
            const {balance,difference} = accountUsernameToTheirDetailsObj[account.name];
            const percentageDifference = Math.abs(difference / balance) * 100;

            if (percentageDifference > 5) {
                adjustmentNeeded = true;
                break;
            }
        }
  
        if (adjustmentNeeded) {
            // Make the adjustments:
            for (let i = 0; i < userSubAccounts_Array.length; i++) {
                const accountA = userSubAccounts_Array[i];
                const accountA_details = accountUsernameToTheirDetailsObj[accountA.name];

                for (let j = 0; j < userSubAccounts_Array.length; j++) {
                    if (i === j) {
                        continue;
                    }

                    const accountB = userSubAccounts_Array[j];
                    const accountB_details = accountUsernameToTheirDetailsObj[accountB.name];

                    if (accountA_details.difference > 0 && accountB_details.difference < 0) {
                        const transferAmount = Math.min(accountA_details.difference, Math.abs(accountB_details.difference));

                        // TODO!! Transfer the difference from accountA to accountB
                        // TODO!! Implement the logic for transferring the funds between the accounts using the API
                        // Transfer money 
                        const createUniversalTransfer_Res = await bybit.clients.bybit_RestClientV5.createUniversalTransfer({
                            amount: transferAmount,
                            coin:"USDT",
                            fromAccountType:"CONTRACT",
                            toAccountType:"CONTRACT",
                            toMemberId: accountB.sub_account_uid,
                            fromMemberId: accountB.sub_account_uid,
                            transferId: require("../../Utils/generateUID").generateUID()
                        });
                        if(createUniversalTransfer_Res.retCode!==0)throw new Error(createUniversalTransfer_Res.retMsg);
                        // Update the account balances and differences
                        accountUsernameToTheirDetailsObj[accountA.name].balance -= transferAmount;
                        accountUsernameToTheirDetailsObj[accountB.name].balance += transferAmount;

                        accountUsernameToTheirDetailsObj[accountA.name].difference -= transferAmount;
                        accountUsernameToTheirDetailsObj[accountB.name].difference += transferAmount;
                    }
                }
            }
        }


       
    }catch(error){
        const newErrorMessage = `(fn:allocateCapitalToSubAccounts):${error.message}`;
        throw new Error(newErrorMessage);
    }
};



