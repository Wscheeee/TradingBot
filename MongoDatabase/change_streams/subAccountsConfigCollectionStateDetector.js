
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
    /**
  * @typedef {(
  *      configDocument:import("../collections/sub_accounts_config/types").Sub_Account_Config_Collection_Document_Interface,
  * )=>any} OnUpdateDocumentCb_Interface
  */
    /**
    * @type {OnUpdateDocumentCb_Interface[]}
    */
    #onUpdateDocumentCallbacks = [];
 
    /**
   * @constructor
   * @param {{mongoDatabase:MongoDatabase}} param0 
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
                this.#onCreateDocumentCallbacks.forEach((cb) => {
                    cb(fullDocument);
                });
            } else if (change.operationType === "update") {
                console.log("(subAccountsConfigCollection):UPDATE event");
                const fullDocumentAfterChange =  change.fullDocument;
                this.#onUpdateDocumentCallbacks.forEach((cb) => {
                    cb(fullDocumentAfterChange);
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
};