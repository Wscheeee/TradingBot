//@ts-check


/**
 * 
 * @param {{
*      masterBybit: import("../../Trader/Bybit").Bybit,
*      masterAccountUserId:string,
*      subAccountsUid:number,
*      sub_account_api_note: string,
*      onError:(error:Error)=>any
* }} param0
*/
module.exports.setSubAccountPermissions =  async function setSubAccountPermissions({
    masterBybit,subAccountsUid,sub_account_api_note
    // onError
}){
    console.log("(fn:setSubAccountPermissions)");
    try{
        // Set Sub Accounts permissions
        // Create Api Key for the Sub Account
        const createSubAccountUIDAPIKey_Res = await masterBybit.clients.bybit_RestClientV5.createSubAccountUIDAPIKey({
            permissions:{
                ContractTrade:["Order","Position"],
                Derivatives:["DerivativesTrade"],
                Wallet:["AccountTransfer","SubMemberTransferList"],
                Exchange:["ExchangeHistory"]

            },
            //@ts-ignore
            readOnly: masterBybit.API_KEYS_READ_ONLY_MODES.READ_AND_WRITE,//Read and Write
            subuid: subAccountsUid,
            note: sub_account_api_note,//"Atomos Default Config"
        });
        if(createSubAccountUIDAPIKey_Res.retCode!==0)throw new Error(createSubAccountUIDAPIKey_Res.retMsg);
        console.log("API kes created");
        return createSubAccountUIDAPIKey_Res;
    }catch(error){
        const newErrorMessage = `(fn:setSubAccountPermissions) ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};