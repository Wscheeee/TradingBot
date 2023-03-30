// ================================
const { MongoDatabase } = require("../MongoDatabase");

module.exports.PositionsStateDetector = class PositionsStateDetector {
  /**
   * @type {MongoDatabase}
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
        const documentId = change.documentKey._id;
        const fullDocument = await this.#mongoDatabase.collection.openTradesCollection.getDocumentById(documentId);
        if (fullDocument.copied) {
          const trader = await this.#mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(fullDocument.trader_uid);
          this.#onNewPositionCallbacks.forEach((cb) => {
            cb(fullDocument, trader);
          });
        }
      } else if (change.operationType === "update") {
        const documentId = change.documentKey._id;
        const updatedFields = change.updateDescription.updatedFields;
        const fullDocument = await this.#mongoDatabase.collection.openTradesCollection.getDocumentById(documentId);
        const trader = await this.#mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(fullDocument.trader_uid);

        let hasRealChange = false;
        for (const key in updatedFields) {
            if (fullDocument[key] !== updatedFields[key]) {
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
            console.log("OpenTrades Document has no real changes.");
        }
    }
    });
  };

  listenToOldTradesCollection() {
    const watcher = this.#mongoDatabase.collection.oldTradesCollection.watchCollection();
    watcher.addListener("change", async (change) => {
      if (change.operationType === "insert") {
        const documentId = change.documentKey._id;
        const fullDocument = await this.#mongoDatabase.collection.oldTradesCollection.getDocumentById(documentId);
        if (fullDocument.copied) {
          const trader = await this.#mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(fullDocument.trader_uid);
          if (fullDocument.part === 0) {
            this.#onCloseFullPositionCallbacks.forEach((cb) => {
              cb(fullDocument, trader);
            });
          } else {
            const originalPosition = await this.#mongoDatabase.collection.oldTradesCollection.getDocumentById(fullDocument.original_position_id);
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