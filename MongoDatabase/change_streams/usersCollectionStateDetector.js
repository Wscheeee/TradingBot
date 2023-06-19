
//@ts-check
// ================================

module.exports.UsersCollectionStateDetector = class UsersCollectionStateDetector {
    /**
   * @type {import("../MongoDatabase").MongoDatabase}
   */
    #mongoDatabase;
    /**
  * @typedef {(
  *      user:import("../collections/users/types").Users_Collection_Document_Interface,
  * )=>any} OnCreateDocumentCb_Interface
  */
    /**
    * @type {OnCreateDocumentCb_Interface[]}
    */
    #onCreateDocumentCallbacks = [];
    /**
  * @typedef {(
  *      userDocumentBeforeUpdate:import("../collections/users/types").UserDocument_Interface|undefined,
  *      userDocumentAfterUpdate:import("../collections/users/types").Users_Collection_Document_Interface,
  * )=>any} OnUpdateDocumentCb_Interface
  */
    /**
    * @type {OnUpdateDocumentCb_Interface[]}
    */
    #onUpdateDocumentCallbacks = [];
    /**
    * @type {OnUpdateDocumentCb_Interface[]}
    */
    #onUserCustomConfigListUpdateCallbacks = [];
 
    /**
   * @constructor
   * @param {{mongoDatabase:import("../MongoDatabase").MongoDatabase}} param0 
   */
    constructor({ mongoDatabase }) {
        this.#mongoDatabase = mongoDatabase;
    }

    listenToUsersCollection() {
        const watcher = this.#mongoDatabase.collection.usersCollection.watchCollection();
        watcher.addListener("change", async (change) => {
            if(change.operationType==="drop")process.exit();//restart the app when the collection is dropped
            if (change.operationType === "insert") {
                const documentId = change.documentKey._id;
                console.log("(subAccountsConfigCollection):INSERT event");
                const fullDocument = await this.#mongoDatabase.collection.usersCollection.getDocumentById(documentId);
                if(!fullDocument)throw new Error(`(subAccountsConfigCollection):INSERT event fullDocument not found for documentId:${documentId}`);
                this.#onCreateDocumentCallbacks.forEach((cb) => {
                    cb(fullDocument);
                });
            } else if (change.operationType === "update") {
                console.log("(subAccountsConfigCollection):UPDATE event");
                // const fullDocumentAfterChange =  change.fullDocument||null;
                const documentId = change.documentKey._id;
                const fullDocumentAfterChange = await this.#mongoDatabase.collection.usersCollection.getDocumentById(change.documentKey._id);
                const fullDocumentBeforeChange = change.fullDocumentBeforeChange;
                if(!fullDocumentAfterChange)throw new Error(`(subAccountsConfigCollection):INSERT event fullDocumentAfterChange not found for documentId:${documentId}`);
                this.#onUpdateDocumentCallbacks.forEach((cb) => {
                    cb(fullDocumentBeforeChange,fullDocumentAfterChange);
                });
                if(change.updateDescription.updatedFields){
                    if(Object.keys(change.updateDescription.updatedFields).includes("custom_sub_account_configs")){
                        this.#onUserCustomConfigListUpdateCallbacks.forEach((cb) => {
                            cb(fullDocumentBeforeChange,fullDocumentAfterChange);
                        });
                    }

                }
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
   * 
   * @param {OnUpdateDocumentCb_Interface} onUpdateDocumentCb 
   */
    onUserCustomConfigListUpdate(onUpdateDocumentCb){
        this.#onUserCustomConfigListUpdateCallbacks.push(onUpdateDocumentCb);

    }
};