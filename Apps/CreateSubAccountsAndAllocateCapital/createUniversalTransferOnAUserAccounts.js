//@ts-check


/**
 * 
 * @param {{
*      masterBybit: import("../../Trader/Bybit").Bybit,
*      masterAccountUserId:string,
*      subAccountsUids:[],
// *      onError:(error:Error)=>any
* }} param0
*/
module.exports.createUniversalTransferOnAUserAccounts =  async function createUniversalTransferOnAUserAccounts({
    masterBybit,masterAccountUserId,subAccountsUids,
    // onError
}){
    console.log("(fn:createUniversalTransferOnAUserAccounts)");
    try{
        // Activate universal transfer for the accounts
        await masterBybit.clients.bybit_RestClientV5.enableUniversalTransferForSubAccountsWithUIDs([masterAccountUserId,...subAccountsUids]);
        return;

    }catch(error){
        const newErrorMessage = `(fn:createUniversalTransferOnAUserAccounts) ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};