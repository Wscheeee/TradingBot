
//@ts-check

const { enableUniversalTransferForSubAccounts } = require("./enableUniversalTransferForSubAccounts");


/**
 * 
 * @param {{
*      masterBybit: import("..//Bybit").Bybit,
*      bybit: import("..//Bybit").Bybit,
*      amount: string,
*      toMemberId: number,
*      fromMemberId: number,
*      subAccountsUids:string[],
*      isRetry?:boolean
* }} param0
*/
module.exports.performUniversalTransfer =  async function performUniversalTransfer({
    masterBybit,bybit,amount,fromMemberId,subAccountsUids,toMemberId,isRetry
    // onError
}){
    console.log("(fn:performUniversalTransfer)"); 
    try{ 
        // Activate universal transfer for the accounts
        await bybit.utils.sleepAsync(2000);
        const createUniversalTransfer_Res = await bybit.clients.bybit_RestClientV5.createUniversalTransfer({
            amount,
            coin:"USDT",
            fromAccountType:"UNIFIED",
            toAccountType:"UNIFIED",
            toMemberId,
            fromMemberId,
            transferId: bybit.utils.generateUID()
        });
        console.log(createUniversalTransfer_Res);
        if(createUniversalTransfer_Res.retCode!==0){
            console.log("(fn:createUniversalTransfer_Res): "+createUniversalTransfer_Res.retMsg);
            if(createUniversalTransfer_Res.retMsg.includes("Sub-account do not have universal transfer permission")){
                // enable and rettry
                console.log("Retrying...");
                await enableUniversalTransferForSubAccounts({
                    masterBybit,
                    subAccountsUids
                });
                await bybit.utils.sleepAsync(2000);
                return await performUniversalTransfer({
                    masterBybit,bybit,amount,fromMemberId,subAccountsUids,toMemberId
                });
            }else if(createUniversalTransfer_Res.retMsg.includes("biz err exist transferring contract out record") && !isRetry){//TODO: Know how many times to retry
                console.log("Retrying...");
                await bybit.utils.sleepAsync(2000);
                return await performUniversalTransfer({
                    masterBybit,bybit,amount,fromMemberId,subAccountsUids,toMemberId,isRetry:true
                });
            }else {

                throw new Error("(fn:createUniversalTransfer_Res): "+createUniversalTransfer_Res.retMsg);
            }
        }
        return;
    }catch(error){
        const newErrorMessage = `(fn:performUniversalTransfer) ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};