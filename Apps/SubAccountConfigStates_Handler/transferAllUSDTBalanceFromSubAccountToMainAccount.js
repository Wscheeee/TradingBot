//@ts-check
const {performUniversalTransfer} = require("./performUniversalTransfer"); 
/**
 * @param {{
*      subAccount_bybit: import("../../Trader/Bybit").Bybit,
*      masterAccount_bybit: import("../../Trader/Bybit").Bybit,
*      sub_account_uid: number,
*      master_acccount_uid: number
*}} param0 
*/
module.exports.transferAllUSDTBalanceFromSubAccountToMainAccount =  async function transferAllUSDTBalanceFromSubAccountToMainAccount({
    subAccount_bybit,masterAccount_bybit,
    master_acccount_uid,sub_account_uid
}){
    try{
        console.log("(fn:transferAllUSDTBalanceFromSubAccountToMainAccount)");
        console.log(subAccount_bybit,masterAccount_bybit,
            master_acccount_uid,sub_account_uid);
        const subAccountWalletBalance = await subAccount_bybit.clients.bybit_AccountAssetClientV3.getUSDTDerivativesAccountWalletBalance();
        console.log({subAccountWalletBalance});
        if(subAccountWalletBalance===0)return;
        await performUniversalTransfer({
            amount:String(subAccountWalletBalance),
            bybit: subAccount_bybit,
            fromMemberId:sub_account_uid,
            masterBybit:masterAccount_bybit,
            toMemberId:master_acccount_uid,
            subAccountsUids:[String(sub_account_uid)]
        });
    }catch(error){
        const newErrorMessage = `(fn:transferAllUSDTBalanceFromSubAccountToMainAccount) ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};