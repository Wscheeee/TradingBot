//@ts-check
// ================================

module.exports.PositionsStateDetector = class PositionsStateDetector {
    // /**
    //  * @type {{[_id:string]:import("../collections/open_trades/types").OpenTrades_Collection_Document_Interface}}
    //  */
    // #openTradesCollection_previousUpdatedDocs = {};

    /**
   * @type {import("../MongoDatabase").MongoDatabase}
   */
    #mongoDatabase;
    /**
  * @typedef {(
  *      position:import("../collections/open_trades/types").OpenTrades_Collection_Document_Interface,
  *      trader:import("../collections/top_traders/types").TopTraderCollection_Document_Interface
  * )=>any} OnOpenPositionCb_Interface
  */
    /**
    * @type {OnOpenPositionCb_Interface[]}
    */
    #onNewPositionCallbacks = [];
    /**
  * @typedef {(
  *      position:import("../collections/open_trades/types").OpenTrades_Collection_Document_Interface,
  *      trader:import("../collections/top_traders/types").TopTraderCollection_Document_Interface
  * )=>any} OnUpdatePositionCb_Interface
  */
    /**
    * @type {OnUpdatePositionCb_Interface[]}
    */
    #onUpdatePositionCallbacks = [];
    /**
  * @typedef {(
  *      originalPosition:import("../collections/open_trades/types").OpenTrades_Collection_Document_Interface,
  *      partPosition:import("../collections/open_trades/types").OpenTrades_Collection_Document_Interface,
  *      trader:import("../collections/top_traders/types").TopTraderCollection_Document_Interface
  * )=>any} OnResizePositionCb_Interface
  */
    /**
  * @type {OnResizePositionCb_Interface[]}
  * */ 
    #onResizePositionCallbacks = [];
    /**
  * @typedef {(
  *      position:import("../collections/open_trades/types").OpenTrades_Collection_Document_Interface,
  *      trader:import("../collections/top_traders/types").TopTraderCollection_Document_Interface
  * )=>any} OnCloseFullPositionCb_Interface
  */
    /**
  * @type {OnCloseFullPositionCb_Interface[]}
  */
    #onCloseFullPositionCallbacks = [];
    /**
   * @constructor
   * @param {{mongoDatabase:import("../MongoDatabase").MongoDatabase}} param0 
   */
    constructor({ mongoDatabase }) {
        this.#mongoDatabase = mongoDatabase;
    }

    listenToOpenTradesCollection() {
        const watcher = this.#mongoDatabase.collection.openTradesCollection.watchCollection();
        watcher.addListener("change", async (change) => {
            if(change.operationType==="drop")process.exit();//restart the app when the collection is dropped
            if (change.operationType === "insert") {
                console.log("(openTradesCollection):INSERT event");
                const documentId = change.documentKey._id;
                const fullDocument = await this.#mongoDatabase.collection.openTradesCollection.getDocumentById(documentId);
                if (fullDocument && fullDocument.copied) {
                    const trader = await this.#mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(fullDocument.trader_uid);
                    if(!trader)throw new Error(`New position came in but trader not found: trader_uid:${fullDocument.trader_uid} position documentId:${fullDocument._id}` );
                    this.#onNewPositionCallbacks.forEach((cb) => {
                        cb(fullDocument, trader);
                    });
                }
                // this.#openTradesCollection_previousUpdatedDocs[documentId.toString("base64")] = fullDocument;
            } else if (change.operationType === "update") {
                console.log("(openTradesCollection):UPDATE event");
                const documentId = change.documentKey._id;
                const updatedFields = change.updateDescription.updatedFields;
                const fullDocumentAfterUpdate =  await this.#mongoDatabase.collection.openTradesCollection.findOne({_id:documentId});
                if(!fullDocumentAfterUpdate) throw new Error(`(openTradesCollection):UPDATE event fullDocumentAfterUpdate is empty for documentId:${change.documentKey._id}`);
                const trader = await this.#mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(fullDocumentAfterUpdate.trader_uid);
                if(!trader) throw new Error(`(openTradesCollection):UPDATE event trader not found for documentId:${change.documentKey._id} and trader_uid:${fullDocumentAfterUpdate.trader_uid}`);
                
                let hasRealChange = false;
                for (const key in updatedFields) {
                    if(key.toLocaleLowerCase().includes("datetime")===false){
                        hasRealChange = true;
                        break;
                    }
                } 

                if (hasRealChange && fullDocumentAfterUpdate.copied) {
                    console.log("OpenTrades Document has real changes!");
                    this.#onUpdatePositionCallbacks.forEach((cb) => {
                        cb(fullDocumentAfterUpdate, trader);
                    });
                } else {
                    // console.log("OpenTrades Document has no real changes.");
                }

                // this.#openTradesCollection_previousUpdatedDocs[documentId.toString("base64")] = fullDocument; 
            }
        });
    }

    listenToOldTradesCollection() {
        const watcher = this.#mongoDatabase.collection.oldTradesCollection.watchCollection();
        watcher.addListener("change", async (change) => {
            if(change.operationType==="drop")process.exit();//restart the app when the collection is dropped
            if (change.operationType === "insert") {
                console.log("(oldTradesCollection):INSERT event");
                const documentId = change.documentKey._id;
                const fullDocument = await this.#mongoDatabase.collection.oldTradesCollection.getDocumentById(documentId);
                if(!fullDocument) throw new Error(`((oldTradesCollection):INSERT event change.fullDocument is empty for documentId:${change.documentKey._id}`);
                if (fullDocument.copied) {
                    const trader = await this.#mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(fullDocument.trader_uid);
                    if(!trader) throw new Error(`(openTradesCollection):UPDATE event trader not found for documentId:${change.documentKey._id} and trader_uid:${fullDocument.trader_uid}`);
                    if (fullDocument.part === 0) {
                        this.#onCloseFullPositionCallbacks.forEach((cb) => {
                            cb(fullDocument, trader);
                        });
                    } else {
                        const originalPosition = await this.#mongoDatabase.collection.openTradesCollection.getDocumentById(fullDocument.original_position_id);
                        if(!originalPosition) throw new Error(`(openTradesCollection):UPDATE event originalPosition not found for documentId:${change.documentKey._id} and trader_uid:${fullDocument.trader_uid} and original_position_id:${fullDocument.original_position_id}`);
                        this.#onResizePositionCallbacks.forEach((cb) => {
                            cb(originalPosition, fullDocument, trader);
                        });
                    }
                }
            }
        });
    }

    // Events
    /**
   * 
   * @param {OnOpenPositionCb_Interface} onOpenPositionCb 
   */
    onNewPosition(onOpenPositionCb) {
        this.#onNewPositionCallbacks.push(onOpenPositionCb);
    }
    /**
   * 
   * @param {OnUpdatePositionCb_Interface} onUpdatePositionCb 
   */
    onUpdatePosition(onUpdatePositionCb) {
        this.#onUpdatePositionCallbacks.push(onUpdatePositionCb);
    }
    /**
   * @param {OnResizePositionCb_Interface} onResizePositionCb 
   */
    onPositionResize(onResizePositionCb) {
        this.#onResizePositionCallbacks.push(onResizePositionCb);
    }
    /**
   * @param {OnCloseFullPositionCb_Interface} onClosePositionCb 
   */
    onPositionClose(onClosePositionCb) {
        this.#onCloseFullPositionCallbacks.push(onClosePositionCb);
    }
};