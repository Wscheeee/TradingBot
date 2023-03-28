'use-strict';
//@ts-check
/**
 * @description Detects when a new position is added and when a position is resized or closed.
 * Logs in the DB and listens for document changes and creation.
 * Listens for all of the needed positions
 */

const {MongoDatabase} = require("../../MongoDatabase");
const {sleepAsync} = require("../../Utils/sleepAsync");


module.exports.PositionsStateDetector = class PositionsStateDetector {
    /**
     * @type {MongoDatabase}
     */
    #mongoDatabase;
    /**
     * @typedef {(
     *      position:import("../../MongoDatabase/collections/open_trades/types").OpenTrades_Collection_Document_Interface,
     *      trader:import("../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface
     * )=>any} OnOpenPositionCb_Interface
     */
    /**
     * @type {OnOpenPositionCb_Interface[]}
     */
    #onNewPositionCallbacks = [];
    /**
     * @typedef {(
     *      originalPosition:import("../../MongoDatabase/collections/open_trades/types").OpenTrades_Collection_Document_Interface,
     *      partPosition:import("../../MongoDatabase/collections/open_trades/types").OpenTrades_Collection_Document_Interface,
     *      trader:import("../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface
     * )=>any} OnResizePositionCb_Interface
     */
    /**
     * @type {OnResizePositionCb_Interface[]}
     */
    #onResizePositionCallbacks = [];
    /**
     * @typedef {(
     *      position:import("../../MongoDatabase/collections/open_trades/types").OpenTrades_Collection_Document_Interface,
     *      trader:import("../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface
     * )=>any} OnCloseFullPositionCb_Interface
     */
    /**
     * @type {OnCloseFullPositionCb_Interface[]}
     */
    #onCloseFullPositionCallbacks = [];
    /**
     * 
     * @param {{mongoDatabase:MongoDatabase}} param0 
     */
    constructor({mongoDatabase}){
        this.#mongoDatabase = mongoDatabase;
    }

    listenToOpenTradesCollection(){
        const watcher = this.#mongoDatabase.collection.openTradesCollection.watchCollection()
        watcher.addListener("change",async (change)=>{
            // get the full document and the trader associated
            if(change.operationType==="insert"){
                const documentId = change.documentKey._id;
                console.log("OpenTrades Document new Position added111!")
                const fullDocument = await this.#mongoDatabase.collection.openTradesCollection.getDocumentById(documentId);
                const trader = await this.#mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(fullDocument.trader_uid);
                // new position added
                console.log("OpenTrades Document new Position added!")
                this.#onNewPositionCallbacks.forEach((cb)=>{
                    cb(fullDocument,trader);
                })
            }else if(change.operationType==="update"){
                // Position updated
                // Check the for immportant updates to note
                console.log("OpenTrades Document updated!")
            }
        })
    };


    listenToOldTradesCollection(){
        const watcher = this.#mongoDatabase.collection.oldTradesCollection.watchCollection()
        watcher.addListener("change",async (change)=>{
            
            // get the full document and the trader associated
            if(change.operationType==="create"){
                const documentId = change.documentKey._id;
                const fullDocument = await this.#mongoDatabase.collection.oldTradesCollection.getDocumentById(documentId);
                const trader = await this.#mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(fullDocument.trader_uid);
                // a position has been partially closed or wholly closed.
                if(fullDocument.part==0){
                    // fully closed
                    console.log("OldTrades Document fully closed!")
                    this.#onCloseFullPositionCallbacks.forEach((cb)=>{
                        cb(fullDocument,trader)
                    })
                }else {
                    const originalPosition = await this.#mongoDatabase.collection.oldTradesCollection.getDocumentById(fullDocument.original_position_id);
                    // partial close
                    console.log("OldTrades Document parrtially closed!")
                    this.#onResizePositionCallbacks.forEach((cb)=>{
                        cb(originalPosition,fullDocument,trader)
                    })
                }
            }else if(change.operationType==="update"){
                console.log("OldTrades Document updated!")
            }else{};
        }) 
    }

    listenToCollectionDrop(){
        const watcher = this.#mongoDatabase.collection.oldTradesCollection.watchCollection()
        watcher.addListener("change",async (change)=>{
            if(change.operationType==="drop"){
                console.log("Collection dropped!!")
            }
        })
    }

    // Events
    /**
     * 
     * @param {OnOpenPositionCb_Interface} onOpenPositionCb 
     */
    onNewPosition(onOpenPositionCb){
        this.#onNewPositionCallbacks.push(onOpenPositionCb)
    }


    /**
     * @param {OnCloseFullPositionCb_Interface} onClosePositionCb 
     */
    onPositionClose(onClosePositionCb){
        this.#onCloseFullPositionCallbacks.push(onClosePositionCb)
    }
    /**
     * 
     * @param {OnResizePositionCb_Interface} onResizePositionCb 
     */
    onPositionResize(onResizePositionCb){
        this.#onResizePositionCallbacks.push(onResizePositionCb)
    }
}