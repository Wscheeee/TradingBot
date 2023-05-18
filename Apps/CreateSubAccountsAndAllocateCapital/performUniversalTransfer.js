
//@ts-check

const { enableUniversalTransferForSubAccounts } = require("./enableUniversalTransferForSubAccounts");


/**
 * 
 * @param {{
*      masterBybit: import("../../Trader/Bybit").Bybit,
*      bybit: import("../../Trader/Bybit").Bybit,
*      amount: string,
*      toMemberId: number,
*      fromMemberId: number,
*      subAccountsUids:string[],
* }} param0
*/
module.exports.performUniversalTransfer =  async function performUniversalTransfer({
    masterBybit,bybit,amount,fromMemberId,subAccountsUids,toMemberId,
    // onError
}){
    console.log("(fn:performUniversalTransfer)");
    try{
        // Activate universal transfer for the accounts
        const createUniversalTransfer_Res = await bybit.clients.bybit_RestClientV5.createUniversalTransfer({
            amount,
            coin:"USDT",
            fromAccountType:"CONTRACT",
            toAccountType:"CONTRACT",
            toMemberId,
            fromMemberId,
            transferId: require("../../Utils/generateUID").generateUID()
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
                return await performUniversalTransfer({
                    masterBybit,bybit,amount,fromMemberId,subAccountsUids,toMemberId
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