/**
 * 
 * @param {{
 *      bybit: import("../Bybit").Bybit
 * }} param0 
 */
async function getSubAccountsAndTheirInfo({
    bybit 
}){
    try{
        // Get sub accounts
        const getSubAccounts_Res = await bybit.clients.bybit_RestClientV5.getSubUIDList();
        console.log("getSubAccounts_Res");
        console.log({getSubAccounts_Res});
        if(getSubAccounts_Res.ext_code!==0)throw new Error(getSubAccounts_Res.ret_msg);
        if(getSubAccounts_Res.result.subMemberIds.length===0) return [];

        
    }catch(error){
        const newErrorMessage = `(fn:getSubAccountsAndTheirInfo):${error.message}`;
        throw new Error(newErrorMessage);
    }
}