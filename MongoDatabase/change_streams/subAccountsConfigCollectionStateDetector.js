
//@ts-check
// ================================

module.exports.SubAccountsConfigCollectionStateDetector = class SubAccountsConfigCollectionStateDetector {
    /**
   * @type {import("../MongoDatabase").MongoDatabase}
   */
    #mongoDatabase;
    /**
  * @typedef {(
  *      configDocument:import("../collections/sub_accounts_config/types").Sub_Account_Config_Collection_Document_Interface,
  * )=>any} OnCreateDocumentCb_Interface
  */
    /**
    * @type {OnCreateDocumentCb_Interface[]}
    */
    #onCreateDocumentCallbacks = [];
    //   *      configDocumentBeforeUpdate: import("../collections/previous_sub_account_config_before_update/types/").Previous_SubAccountConfig_Before_Update_Collection_Document_Interface,
    /**
  * @typedef {(
  *     configDocumentBeforeUpdate: import("../collections/sub_accounts_config/types").Sub_Account_Config_Document_Interface,
  *      configDocumentAfterUpdate:import("../collections/sub_accounts_config/types").Sub_Account_Config_Collection_Document_Interface,
  * )=>any} OnUpdateDocumentCb_Interface
  */
    /**
    * @type {OnUpdateDocumentCb_Interface[]}
    */
    #onUpdateDocumentCallbacks = [];

    /**
  * @typedef {(
  *      configDocumentBeforeDelete: import("../collections/sub_accounts_config/types").Sub_Account_Config_Document_Interface,
  * )=>any} OnDeleteDocumentCb_Interface
  */
    /**
    * @type {OnDeleteDocumentCb_Interface[]}
    */
    #onDeleteDocumentCallbacks = [];
 
    // #update_collection_that_holds_previous_documents_before_update = true;
    /**
   * @constructor
   * @param {{mongoDatabase:import("../MongoDatabase").MongoDatabase}} param0 
   */
    constructor({ mongoDatabase }) {
        this.#mongoDatabase = mongoDatabase;
    }

    listenToSubAccountsConfigCollection() {
        const watcher = this.#mongoDatabase.collection.subAccountsConfigCollection.watchCollection();
        watcher.addListener("change", async (change) => {
            if(change.operationType==="drop")process.exit();//restart the app when the collection is dropped

            if (change.operationType === "insert") {
                console.log("(subAccountsConfigCollection):INSERT event");
                const documentId = change.documentKey._id;
                const fullDocument = await this.#mongoDatabase.collection.subAccountsConfigCollection.getDocumentById(documentId);
                if(!fullDocument)return;
                this.#onCreateDocumentCallbacks.forEach((cb) => {
                    cb(fullDocument);
                });
                // if(this.#update_collection_that_holds_previous_documents_before_update ){
                //     // Save it to previous sub account config before update
                //     await this.#mongoDatabase.collection.subAccountsConfigCollection.saveDocumentInDB_In_previousDocumentBeforeUpdateCollection(documentId);

                // }
            } else if (change.operationType === "update") {
                console.log("(subAccountsConfigCollection):UPDATE event");
                const documentId = change.documentKey._id;
                // let fullDocumentAfterChange =  change.fullDocument;
                const fullDocumentAfterChange = await this.#mongoDatabase.collection.subAccountsConfigCollection.findOne({_id:documentId});
                console.log({fullDocumentAfterChange});
                if(!fullDocumentAfterChange){
                    return;
                }
                if(!fullDocumentAfterChange)return;
                const documentBeforeUpdate = change.fullDocumentBeforeChange; 
                console.log({documentBeforeUpdate});
                if(!documentBeforeUpdate)return;
                this.#onUpdateDocumentCallbacks.forEach((cb) => {
                    cb(documentBeforeUpdate,fullDocumentAfterChange);
                });
                // if(this.#update_collection_that_holds_previous_documents_before_update ){
                //     // Save it to previous sub account config before update
                //     await this.#mongoDatabase.collection.subAccountsConfigCollection.saveDocumentInDB_In_previousDocumentBeforeUpdateCollection(documentId);

                // }

            } else if(change.operationType==="delete"){
                console.log("(subAccountsConfigCollection):DELETE event");
                // const documentId = change.documentKey._id;
                // const fullDocumentAfterChange =  change.fullDocument;
                const documentBeforedDelete = change.fullDocumentBeforeChange;
                if(!documentBeforedDelete)return;
                this.#onDeleteDocumentCallbacks.forEach((cb) => {
                    cb(documentBeforedDelete);
                });
            }
        });
    }


    // Events
    /**
   * 
   * @param {OnCreateDocumentCb_Interface} onCreateDocumentCb 
   */
    onCreateDocument(onCreateDocumentCb) {
        this.#onCreateDocumentCallbacks.push(onCreateDocumentCb);
    }
    /**
   * 
   * @param {OnUpdateDocumentCb_Interface} onUpdateDocumentCb 
   */
    onUpdateDocument(onUpdateDocumentCb) {
        this.#onUpdateDocumentCallbacks.push(onUpdateDocumentCb);
    }

    /**
     * @param {OnDeleteDocumentCb_Interface} onDeleteDocumentCb
     */
    onDeleteDocumentCallbacks(onDeleteDocumentCb){
        this.#onDeleteDocumentCallbacks.push(onDeleteDocumentCb);
    }
};