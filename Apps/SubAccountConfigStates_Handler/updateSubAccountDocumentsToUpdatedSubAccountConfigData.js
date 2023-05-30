//@ts-check
/**
 * Marks posittions as closed in the database
 */

/**
 * @param {{
*      previous_trader_uid: string,
*      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
*      updatedSubAccountConfigDocument: import("../../MongoDatabase/collections/sub_accounts_config/types").Sub_Account_Config_Collection_Document_Interface|null
* }} param0
*/
module.exports.updateSubAccountDocumentsToUpdatedSubAccountConfigData = async function updateSubAccountDocumentsToUpdatedSubAccountConfigData({
    mongoDatabase,previous_trader_uid,updatedSubAccountConfigDocument
}){
    const FUNCTION_NAME = "(fn:updateSubAccountDocumentsToUpdatedSubAccountConfigData)";
    try{
       
        /**
        * Remove Trader details from the previously associated id
        */
        const subAccountsAssociatedToTheTrader_Documents_Cursor = await mongoDatabase.collection.subAccountsCollection.getAllDocumentsBy({trader_uid:previous_trader_uid});
        while(await subAccountsAssociatedToTheTrader_Documents_Cursor.hasNext() ){
            const subAccount_document = await subAccountsAssociatedToTheTrader_Documents_Cursor.next();
            if(!subAccount_document)return;
            // Remove trader details from sub account
            await mongoDatabase.collection.subAccountsCollection.updateDocument(subAccount_document._id,{
                trader_uid:updatedSubAccountConfigDocument?updatedSubAccountConfigDocument.trader_uid:"",
                trader_username:updatedSubAccountConfigDocument?updatedSubAccountConfigDocument.trader_username:""
            });
        }

    }catch(error){
        const newErrorMessage = `${FUNCTION_NAME}: ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};