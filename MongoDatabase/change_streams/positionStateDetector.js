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
  *      previousPositionDocument: import("../collections/open_trades/types").OpenTrades_Interface,
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
  *      closedPartPosition:import("../collections/old_trades/types").OldTrades_Collection_Document_Interface,
  *      trader:import("../collections/top_traders/types").TopTraderCollection_Document_Interface
  * )=>any} OnResizePositionCb_Interface
  */
    /**
  * @type {OnResizePositionCb_Interface[]}
  * */ 
    #onResizePositionCallbacks = [];
    /**
  * @typedef {(
  *      closedPosition:import("../collections/old_trades/types").OldTrades_Collection_Document_Interface,
  *      trader:import("../collections/top_traders/types").TopTraderCollection_Document_Interface
  * )=>any} OnCloseFullPositionCb_Interface
  */
    /**
  * @type {OnCloseFullPositionCb_Interface[]}
  */
    #onCloseFullPositionCallbacks = [];


    /**
  * @type {OnCloseFullPositionCb_Interface[]}
  */
    #onPositionCloseFor_TraderRemovedFromAtomosSubAccountConfig_Callbacks = [];
    /**
  * @type {OnCloseFullPositionCb_Interface[]}
  */
    #onPositionCloseFor_TraderRemovedFromUserCustomSubAccountConfig_Callbacks = [];

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
                const FUNCTION_NAME = "(openTradesCollection):INSERT event";
                console.log(FUNCTION_NAME);
                const documentId = change.documentKey._id;
                const fullDocument = await this.#mongoDatabase.collection.openTradesCollection.getDocumentById(documentId);
                // if(!fullDocument)throw new Error(`${FUNCTION_NAME}: fullDocument not found`); // removed beause I don't think it's necessary.
                if (fullDocument && fullDocument.copied) {
                    const trader = await this.#mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(fullDocument.trader_uid);
                    if(!trader)throw new Error(`New position came in but trader not found: trader_uid:${fullDocument.trader_uid} position documentId:${fullDocument._id}` );
                    this.#onNewPositionCallbacks.forEach((cb) => {
                        cb(fullDocument, trader);
                    });
                }else {
                    ///
                    console.log("Document failed to be counted as new position");
                    console.log({fullDocument});
                }
                // Save in previous open trades before update
                // await this.#mongoDatabase.collection.openTradesCollection.saveDocumentInDB_In_previousDocumentBeforeUpdateCollection(documentId);
               
            } else if (change.operationType === "update") {
                // console.log("(openTradesCollection):UPDATE event");
                const documentId = change.documentKey._id;
                const updatedFields = change.updateDescription.updatedFields; 
                const fullDocumentAfterUpdate =  await this.#mongoDatabase.collection.openTradesCollection.findOne({_id:documentId});
                if(!fullDocumentAfterUpdate) throw new Error(`(openTradesCollection):UPDATE event fullDocumentAfterUpdate is empty for documentId:${change.documentKey._id}`);
                const trader = await this.#mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(fullDocumentAfterUpdate.trader_uid);
                if(!trader) throw new Error(`(openTradesCollection):UPDATE event trader not found for documentId:${change.documentKey._id} and trader_uid:${fullDocumentAfterUpdate.trader_uid}`);
                
                let hasRealChange = false;
                for (const key in updatedFields) {
                    const keysToDetectAsUpdates = ["size","leverage"];
                    // console.log({keysToDetectAsUpdates,key:key.toLocaleLowerCase()});
                    // if(key.toLocaleLowerCase().includes("datetime")===false){
                    if(keysToDetectAsUpdates.includes(key.toLocaleLowerCase())){
                        hasRealChange = true;
                        break;
                    }
                } 
                // console.log({hasRealChange});

                if (hasRealChange && fullDocumentAfterUpdate.copied) {
                    // const previousDoc = this.#mongoDatabase.collection.openTradesCollection.previousDocumentsForUpdates_Object[fullDocumentAfterUpdate._id.toString()];
                    // const previousDocBeforeUpdate = await this.#mongoDatabase.collection.openTradesCollection.previousOpenTradesBeforeUpdate_Collection.findOne({original_document_id: fullDocumentAfterUpdate._id});
                    const previousDocBeforeUpdate = change.fullDocumentBeforeChange;
                    if(previousDocBeforeUpdate && ( (previousDocBeforeUpdate.leverage!==fullDocumentAfterUpdate.leverage) || (previousDocBeforeUpdate.size<fullDocumentAfterUpdate.size) )){
                        // Run only if leverage changed or size increased
                        // console.log("OpenTrades Document has real changes!");
                        console.log("(openTradesCollection):UPDATE event");
                        this.#onUpdatePositionCallbacks.forEach((cb) => {
                            cb(previousDocBeforeUpdate,fullDocumentAfterUpdate, trader);
                        });

                    }
                } else {
                    // console.log("OpenTrades Document has no real changes.");
                } 

                // Save in previous open trades before update
                // await this.#mongoDatabase.collection.openTradesCollection.saveDocumentInDB_In_previousDocumentBeforeUpdateCollection(documentId);
               

            }else if(change.operationType === "delete"){
                const documentId = change.documentKey._id;
                console.log("(openTradesCollection):UPDATE event :"+documentId.toString());
                // Delete from previous open trades before update
                // await this.#mongoDatabase.collection.openTradesCollection.previousOpenTradesBeforeUpdate_Collection.deleteManyDocumentsByIds([documentId]);
               
            }
        });
    }

    listenToOldTradesCollection() {
        const watcher = this.#mongoDatabase.collection.oldTradesCollection.watchCollection();
        watcher.addListener("change", async (change) => { 
            if(change.operationType==="drop")process.exit();//restart the app when the collection is dropped
            if (change.operationType === "insert") {
                console.log("(oldTradesCollection):INSERT event");
                console.log({fullDocument: change.fullDocument});
                const documentId = change.documentKey._id;
                const fullDocument = await this.#mongoDatabase.collection.oldTradesCollection.getDocumentById(documentId);
                if(!fullDocument) throw new Error(`((oldTradesCollection):INSERT event change.fullDocument is empty for documentId:${change.documentKey._id}`);
                console.log({fullDocument2: fullDocument});
                if (fullDocument.copied) {
                    const trader = await this.#mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(fullDocument.trader_uid);
                    console.log({trader});
                    if(!trader) throw new Error(`(openTradesCollection):UPDATE event trader not found for documentId:${change.documentKey._id} and trader_uid:${fullDocument.trader_uid}`);
                    if (fullDocument.part === 0) {
                        if(fullDocument.reason==="TRADER_CLOSED_THIS_POSITION"||!fullDocument.reason){
                            console.log("Reason: TRADER_CLOSED_THIS_POSITION");
                            this.#onCloseFullPositionCallbacks.forEach((cb) => {
                                console.log("Called: cb: onCloseFullPositionCallbacks");
                                cb(fullDocument, trader);
                            });

                        }else if(fullDocument.reason==="TRADER_REMOVED_FROM_ATOMOS_SUB_ACCOUNT_CONFIG"){
                            console.log("Reason: TRADER_REMOVED_FROM_ATOMOS_SUB_ACCOUNT_CONFIG");
                            this.#onPositionCloseFor_TraderRemovedFromAtomosSubAccountConfig_Callbacks.forEach((cb)=>{
                                console.log("Called: cb: onPositionCloseFor_TraderRemovedFromAtomosSubAccountConfig_Callbacks");
                                cb(fullDocument, trader);
                            });
                        }else if(fullDocument.reason==="TRADER_REMOVED_FROM_USER_CUSTOM_SUB_ACCOUNT_CONFIG"){
                            console.log("Reason: TRADER_REMOVED_FROM_USER_CUSTOM_SUB_ACCOUNT_CONFIG");
                            this.#onPositionCloseFor_TraderRemovedFromUserCustomSubAccountConfig_Callbacks.forEach((cb)=>{
                                console.log("Called: cb: onPositionCloseFor_TraderRemovedFromUserCustomSubAccountConfig_Callbacks");
                                cb(fullDocument, trader);
                            });
                        }else {
                            throw new Error("changestream(fn:listenToOldTradesCollection) Unknown reason for closing position: Contact dev to debug issue");
                        }
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
    /**
   * @param {OnCloseFullPositionCb_Interface} onClosePositionCb 
   */
    onPositionClose_forTraderRemovedFromAtomosConfig(onClosePositionCb) {
        this.#onPositionCloseFor_TraderRemovedFromAtomosSubAccountConfig_Callbacks.push(onClosePositionCb);
    }
    /**
   * @param {OnCloseFullPositionCb_Interface} onClosePositionCb 
   */
    onPositionClose_forTraderRemovedFromUserCustomConfig(onClosePositionCb) {
        this.#onPositionCloseFor_TraderRemovedFromUserCustomSubAccountConfig_Callbacks.push(onClosePositionCb);
    }


};