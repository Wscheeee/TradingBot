
//@ts-check
// ================================

module.exports.TopTradersCollectionStateDetector = class TopTradersCollectionStateDetector {
    /**
   * @type {import("../MongoDatabase").MongoDatabase}
   */
    #mongoDatabase;
    /**
  * @typedef {(
  *      topTraderDocument:import("../collections/top_traders/types").TopTraderCollection_Document_Interface,
  * )=>any} OnCreateDocumentCb_Interface
  */
    /**
    * @type {OnCreateDocumentCb_Interface[]}
    */
    #onCreateDocumentCallbacks = [];
  
    /**
  * @typedef {(
  *     topTraderDocumentBeforeUpdate: import("../collections/top_traders/types").TopTraderDocument_Interface|undefined,
  *     topTraderDocumentAfterUpdate:import("../collections/top_traders/types").TopTraderCollection_Document_Interface,
  * )=>any} OnUpdateDocumentCb_Interface
  */
    /**
    * @type {OnUpdateDocumentCb_Interface[]}
    */
    #onUpdateDocumentCallbacks = [];

    /**
  * @typedef {(
  *      topTraderDocumentBeforeDelete: import("../collections/top_traders/types").TopTraderDocument_Interface,
  * )=>any} OnDeleteDocumentCb_Interface
  */
    /**
    * @type {OnDeleteDocumentCb_Interface[]}
    */
    #onDeleteDocumentCallbacks = [];


    /**
     * @type { Array< keyof import("../collections/top_traders/types").TopTraderDocument_Interface>} updateFilters
     */
    #arrayOfUpdateFilters = [];


 
    // #update_collection_that_holds_previous_documents_before_update = true;
    /**
   * @constructor
   * @param {{
   *    mongoDatabase:import("../MongoDatabase").MongoDatabase,
   *    arrayOfUpdateFilters: Array< keyof import("../collections/top_traders/types").TopTraderDocument_Interface>
   * }} param0 
   */
    constructor({ mongoDatabase ,arrayOfUpdateFilters}) {
        this.#mongoDatabase = mongoDatabase;
        this.#arrayOfUpdateFilters = arrayOfUpdateFilters;
    }

    listenToTopTradersCollectionCollection() {
        const watcher = this.#mongoDatabase.collection.topTradersCollection.watchCollection();
        watcher.addListener("change", async (change) => {
            if(change.operationType==="drop")process.exit();//restart the app when the collection is dropped

            if (change.operationType === "insert") {
                console.log("(topTradersCollection):INSERT event");
                const documentId = change.documentKey._id;
                const fullDocument = await this.#mongoDatabase.collection.topTradersCollection.getDocumentById(documentId);
                if(!fullDocument)return;
                this.#onCreateDocumentCallbacks.forEach((cb) => {
                    cb(fullDocument);
                });
            } else if (change.operationType === "update") {
                console.log("(topTradersCollection):UPDATE event");
                const documentId = change.documentKey._id;

                /**
                * @type {string[]}
                */
                const arrayOfupdatedFields = Object.keys(change.updateDescription.updatedFields||{});

                let passedUpdateCheck = arrayOfupdatedFields.find((key)=>{
                    //@ts-ignore
                    if(this.#arrayOfUpdateFilters.includes(key)){
                        return key;
                    }
                });
                if(!passedUpdateCheck)return;

                // let fullDocumentAfterChange =  change.fullDocument;
                const fullDocumentAfterChange = await this.#mongoDatabase.collection.topTradersCollection.findOne({_id:documentId});
                console.log({fullDocumentAfterChange});
                if(!fullDocumentAfterChange){
                    return;
                }
                if(!fullDocumentAfterChange)return;
                const documentBeforeUpdate = change.fullDocumentBeforeChange; 
                console.log({documentBeforeUpdate});
                // if(!documentBeforeUpdate)return;
                this.#onUpdateDocumentCallbacks.forEach((cb) => {
                    cb(documentBeforeUpdate,fullDocumentAfterChange);
                });

            } else if(change.operationType==="delete"){
                console.log("(topTradersCollection):DELETE event");
                // const documentId = change.documentKey._id;
      
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