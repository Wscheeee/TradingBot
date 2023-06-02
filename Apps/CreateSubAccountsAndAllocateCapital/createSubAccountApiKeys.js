// createSubAccountApiKey.js
/**
 * 
 * @param {{
 *   bybit: import("../../Trader/Bybit").Bybit,
 *   sub_account_uid: string,
 *   sub_account_api_note: string
 * }} param0 
 */
module.exports.createSubAccountApiKeys = async function createSubAccountApiKeys({
    bybit,sub_account_api_note,sub_account_uid
}){
    const FUNCTION_NAME = "(fn:createSubAccountApiKey)";
    console.log(FUNCTION_NAME);
    try{
        // Create Api Key for the Sub Account
        const createSubAccountUIDAPIKey_Res = await bybit.clients.bybit_RestClientV5.createSubAccountUIDAPIKey({
            permissions:{
                ContractTrade:["Order","Position"],
                Derivatives:["DerivativesTrade"],
                Wallet:["AccountTransfer","SubMemberTransferList"],
                Exchange:["ExchangeHistory"]

            }, 
            //@ts-ignore
            readOnly: bybit.API_KEYS_READ_ONLY_MODES.READ_AND_WRITE,//Read and Write
            subuid: Number(sub_account_uid),
            note: sub_account_api_note,//"Atomos Default Config"
        });
        if(createSubAccountUIDAPIKey_Res.retCode!==0)throw new Error(createSubAccountUIDAPIKey_Res.retMsg);
        console.log("API kes created");
        return createSubAccountUIDAPIKey_Res;
    }catch(error){
        const newErrorMessage = `${FUNCTION_NAME}: ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};