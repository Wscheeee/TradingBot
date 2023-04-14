// ================================

module.exports.PositionsStateDetector = class PositionsStateDetector {
    /**
     * @type {{[_id:string]:import("../collections/open_trades/types").OpenTrades_Collection_Document_Interface}}
     */
    #openTradesCollection_previousUpdatedDocs = {};

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
   * @param {{mongoDatabase:MongoDatabase}} param0 
   */
    constructor({ mongoDatabase }) {
        this.#mongoDatabase = mongoDatabase;
    }

    listenToOpenTradesCollection() {
        const watcher = this.#mongoDatabase.collection.openTradesCollection.watchCollection();
        watcher.addListener("change", async (change) => {
            if (change.operationType === "insert") {
                console.log("(openTradesCollection):INSERT event");
                const documentId = change.documentKey._id;
                const fullDocument = await this.#mongoDatabase.collection.openTradesCollection.getDocumentById(documentId);
                if (fullDocument.copied) {
                    const trader = await this.#mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(fullDocument.trader_uid);
                    this.#onNewPositionCallbacks.forEach((cb) => {
                        cb(fullDocument, trader);
                    });
                }
                this.#openTradesCollection_previousUpdatedDocs[documentId.toString("base64")] = fullDocument;
            } else if (change.operationType === "update") {
                console.log("(openTradesCollection):UPDATE event");
                const documentId = change.documentKey._id;
                const previousDoc = this.#openTradesCollection_previousUpdatedDocs[documentId.toString("base64")];
                const updatedFields = change.updateDescription.updatedFields;
                // let fullDocument = change.fullDocumentBeforeChange;//await this.#mongoDatabase.collection.openTradesCollection.getDocumentById(documentId);
                const fullDocument =  change.fullDocument;
                console.log({
                    fullDocument,
                    updatedFields,
                    previousDoc
                });
                if(!fullDocument || !previousDoc)return;
                if(fullDocument.size===previousDoc.size) return;
                const trader = await this.#mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(fullDocument.trader_uid);
                //change.fullDocumentBeforeChange
                console.log("Passed previousDoc :",previousDoc);
                let hasRealChange = false;
                for (const key in updatedFields) {
                    if(key.toLowerCase().includes("datetime"))continue;
                    if (previousDoc[key] !== updatedFields[key]) {
                        hasRealChange = true;
                        break;
                    }
                }

                if (hasRealChange && fullDocument.copied) {
                    console.log("OpenTrades Document has real changes!");
                    this.#onUpdatePositionCallbacks.forEach((cb) => {
                        cb(fullDocument, trader);
                    });
                } else {
                    // console.log("OpenTrades Document has no real changes.");
                }

                this.#openTradesCollection_previousUpdatedDocs[documentId.toString("base64")] = fullDocument; 
            }
        });
    }

    listenToOldTradesCollection() {
        const watcher = this.#mongoDatabase.collection.oldTradesCollection.watchCollection();
        watcher.addListener("change", async (change) => {
            if (change.operationType === "insert") {
                console.log("(oldTradesCollection):INSERT event");
                const documentId = change.documentKey._id;
                const fullDocument = await this.#mongoDatabase.collection.oldTradesCollection.getDocumentById(documentId);
                if (fullDocument.copied) {
                    const trader = await this.#mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(fullDocument.trader_uid);
                    if (fullDocument.part === 0) {
                        this.#onCloseFullPositionCallbacks.forEach((cb) => {
                            cb(fullDocument, trader);
                        });
                    } else {
                        const originalPosition = await this.#mongoDatabase.collection.openTradesCollection.getDocumentById(fullDocument.original_position_id);
                        this.#onResizePositionCallbacks.forEach((cb) => {
                            cb(originalPosition, fullDocument, trader);
                        });
                    }
                }
                // delete the doc obj from mem
                if(fullDocument.part===0){
                    delete this.#openTradesCollection_previousUpdatedDocs[documentId.toString("base64")];
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