// ================================
module.exports.TradedPositionsStateDetector = class TradedPositionsStateDetector {
    /**
     * @type {{[_id:string]:import("../collections/traded_positions/types").TradedPosition_Collection_Document_Interface}}
     */
    #tradedPositionsCollection_previousUpdatedDocs = {};

    /**
   * @type {import("../MongoDatabase").MongoDatabase}
   */
    #mongoDatabase;
    /**
  * @typedef {(
  *      tradedPosition:import("../collections/traded_positions/types").TradedPosition_Collection_Document_Interface,
  *      trader:import("../collections/top_traders/types").TopTraderDocument_Interface
  * )=>any} OnNewTradedPositionCb_Interface
  */
    /**
    * @type {OnNewTradedPositionCb_Interface[]}
    */
    #onNewTradedPositionCallbacks = [];
    /**
  * @typedef {(
  *     closedTradedPosition:import("../collections/traded_positions/types").TradedPosition_Collection_Document_Interface,
  *     trader:import("../collections/top_traders/types").TopTraderDocument_Interface
  * )=>any} OnCloseTradedPosition_Full_Cb_Interface
  */
    /**
    * @type {OnCloseTradedPosition_Full_Cb_Interface[]}
    */
    #onCloseTradedPosition_Full_Callbacks = [];
    /**
  * @typedef {(
  *      tradedPosition_full:import("../collections/traded_positions/types").TradedPosition_Collection_Document_Interface,
  *      closedTradedPosition_partial:import("../collections/traded_positions/types").TradedPosition_Collection_Document_Interface,
  *     trader:import("../collections/top_traders/types").TopTraderDocument_Interface
  * )=>any} OnCloseTradedPosition_Partial_Cb_Interface
  */
    /**
    * @type {OnCloseTradedPosition_Partial_Cb_Interface[]}
    */
    #onCloseTradedPosition_Partial_Callbacks = [];



    //     /**
    //   * @typedef {(
    //   *      old_tradedPosition:import("../collections/traded_positions/types").TradedPosition_Collection_Document_Interface,
    //   *      updated_tradedPosition:import("../collections/traded_positions/types").TradedPosition_Collection_Document_Interface
    //   * )=>any} OnUpdateTradedPositionCb_Interface
    //   */
    //     /**
    //     * @type {OnUpdateTradedPositionsCb_Interface[]}
    //     */
    //     #onUpdateTradedPositionCallbacks = [];


    /**
   * @constructor
   * @param {{mongoDatabase:MongoDatabase}} param0 
   */
    constructor({ mongoDatabase }) {
        this.#mongoDatabase = mongoDatabase;
    }

    listenToTradedPositionsCollection() {
        const watcher = this.#mongoDatabase.collection.openTradesCollection.watchCollection();
        watcher.addListener("change", async (change) => {
            if(change.operationType==="drop")process.exit();//restart the app when the collection is dropped
            if (change.operationType === "insert") {
                console.log("(tradedPositionsCollection):INSERT event");
                const documentId = change.documentKey._id;
                const fullDocument = await this.#mongoDatabase.collection.tradedPositionsCollection.getDocumentById(documentId);
                const traderDoc = await this.#mongoDatabase.collection.topTradersCollection.findOne({
                    uid: fullDocument.trader_uid
                });
                if(fullDocument.status==="OPEN"){
                    this.#onNewTradedPositionCallbacks.forEach((cb) => {
                        cb(fullDocument,traderDoc);
                    });
                    this.#tradedPositionsCollection_previousUpdatedDocs[documentId.toString("base64")] = fullDocument;

                }else if(fullDocument.status==="CLOSED"){
                    console.log("Closed partial");
                    const originalDoc = await this.#mongoDatabase.collection.tradedPositionsCollection.findOne({
                        original_traded_position_document_id:1
                    });
                    this.#onCloseTradedPosition_Partial_Callbacks .forEach((cb)=>{
                        cb(originalDoc,fullDocument,traderDoc);
                    });
                    delete this.#tradedPositionsCollection_previousUpdatedDocs[documentId.toString("base64")];
                }else {
                    console.error("traded position status invalid: not 'OPEN'|'CLOSE' (tradedPositions _id:"+fullDocument._id);
                }
            }else if(change.operationType==="delete"){
                const documentId = change.documentKey._id;
                // delete from this.#tradedPositionsCollection_previousUpdatedDocs[documentId.toString("base64")];
                delete this.#tradedPositionsCollection_previousUpdatedDocs[documentId.toString("base64")];
            }else if (change.operationType === "update") {
                // // console.log("(openTradesCollection):UPDATE event");
                // const documentId = change.documentKey._id;
                // const previousDoc = this.#tradedPositionsCollection_previousUpdatedDocs[documentId.toString("base64")];
                // const updatedFields = change.updateDescription.updatedFields;
                // // let fullDocument = change.fullDocumentBeforeChange;//await this.#mongoDatabase.collection.openTradesCollection.getDocumentById(documentId);
                // const fullDocument =  change.fullDocument;
                // // console.log({
                // //     fullDocument,
                // //     updatedFields,
                // //     previousDoc
                // // });
                // if(!fullDocument || !previousDoc)return;
                // const trader = await this.#mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(fullDocument.trader_uid);
                // //change.fullDocumentBeforeChange
                // console.log("Passed previousDoc :",previousDoc);
                // let hasRealChange = false;
                // for (const key in updatedFields) {
                //     if(key.toLowerCase().includes("datetime"))continue;
                //     if (previousDoc[key] !== updatedFields[key]) {
                //         hasRealChange = true;
                //         break;
                //     }
                // }

                // if (hasRealChange && fullDocument.copied) {
                //     console.log("OpenTrades Document has real changes!");
                //     this.#onUpdatePositionCallbacks.forEach((cb) => {
                //         cb(fullDocument, trader);
                //     });
                // } else {
                //     // console.log("OpenTrades Document has no real changes.");
                // }

                // this.#tradedPositionsCollection_previousUpdatedDocs[documentId.toString("base64")] = fullDocument; 
            }
        });
    }



    // Events
    /**
   * 
   * @param {OnNewTradedPositionCb_Interface} onNewTradedPositionCb 
   */
    onNewPosition(onNewTradedPositionCb) {
        this.#onNewTradedPositionCallbacks.push(onNewTradedPositionCb);
    }
    /**
   * 
   * @param {OnCloseTradedPosition_Full_Cb_Interface} onCloseTradedPositionCb 
   */
    onCloseTradedPosition_Full(onCloseTradedPositionCb) {
        this.#onCloseTradedPosition_Full_Callbacks.push(onCloseTradedPositionCb);
    }
    /**
   * 
   * @param {OnCloseTradedPosition_Partial_Cb_Interface} onCloseTradedPosition_Partial_Cb 
   */
    onCloseTradedPosition_Partial(onCloseTradedPosition_Partial_Cb) {
        this.#onCloseTradedPosition_Partial_Callbacks .push(onCloseTradedPosition_Partial_Cb);
    }
    //     /**
    //    * 
    //    * @param {OnUpdateTradedPositionCb_Interface} onUpdateTradedPositionCb 
    //    */
    //     onUpdatePosition(onUpdateTradedPositionCb) {
    //         this.#onUpdateTradedPositionCallbacks.push(onUpdateTradedPositionCb);
    //     }
  
};