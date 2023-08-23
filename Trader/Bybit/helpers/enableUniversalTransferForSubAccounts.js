//@ts-check


/**
 * 
 * @param {{
*      masterBybit: import("..//Bybit").Bybit,
*      subAccountsUids:string[],
* }} param0
*/
module.exports.enableUniversalTransferForSubAccounts =  async function enableUniversalTransferForSubAccounts({
    masterBybit,subAccountsUids,
    // onError
}){
    console.log("(fn:enableUniversalTransferForSubAccounts)");
    try{
        // Activate universal transfer for the accounts
        const res = await masterBybit.clients.bybit_RestClientV5.enableUniversalTransferForSubAccountsWithUIDs([subAccountsUids.join(",")]);
        console.log(res);
        if(res.retCode!==0)throw("(fn:enableUniversalTransferForSubAccounts) "+res.retMsg);
        return;
    }catch(error){
        const newErrorMessage = `(fn:enableUniversalTransferForSubAccounts) ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};