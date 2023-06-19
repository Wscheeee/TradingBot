//@ts-check
/**
 * Marks posittions as closed in the database
 */

/**
 * @param {{
 *      sub_link_name: string,
*      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
*      updatedSubAccountConfigDocument: import("../../MongoDatabase/collections/sub_accounts_config/types").Sub_Account_Config_Collection_Document_Interface|null|import("../../MongoDatabase/collections/sub_accounts_config/types").Sub_Account_Config_Document_Interface
* }} param0
*/
// *      previous_trader_uid: string,
// *      subAccountConfigDocumentBeforeUpdate: import("../../MongoDatabase/collections/previous_sub_account_config_before_update/types").Previous_SubAccountConfig_Before_Update_Collection_Document_Interface,
module.exports.updateSubAccountDocumentsToUpdatedSubAccountConfigData = async function updateSubAccountDocumentsToUpdatedSubAccountConfigData({
    mongoDatabase,sub_link_name,updatedSubAccountConfigDocument
}){
    const FUNCTION_NAME = "(fn:updateSubAccountDocumentsToUpdatedSubAccountConfigData)";
    try{
       
        /**
         * Get sub accounts with sub link name
         */
        const subAccountsAssociatedToTheSubLinkNameAndTestnetValue_Documents_Cursor = await mongoDatabase.collection.subAccountsCollection.getAllDocumentsBy({
            sub_link_name, 
        });
        while(await subAccountsAssociatedToTheSubLinkNameAndTestnetValue_Documents_Cursor.hasNext() ){
            const subAccount_document = await subAccountsAssociatedToTheSubLinkNameAndTestnetValue_Documents_Cursor.next();
            if(!subAccount_document)return;
            // Remove trader details from sub account
            await mongoDatabase.collection.subAccountsCollection.updateDocument(subAccount_document._id,{
                trader_uid:updatedSubAccountConfigDocument?updatedSubAccountConfigDocument.trader_uid:"",
                trader_username:updatedSubAccountConfigDocument?updatedSubAccountConfigDocument.trader_username:"",
                weight: updatedSubAccountConfigDocument?Number(updatedSubAccountConfigDocument.weight):0
            });
        }

    }catch(error){
        const newErrorMessage = `${FUNCTION_NAME}: ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};