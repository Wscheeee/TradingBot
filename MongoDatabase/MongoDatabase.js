/**
 * Instatiate the database and hande db commands
 */
const {  MongoClient, ObjectId} = require("mongodb");
const {
    UsersCollection,
    OldTradesCollection,
    OpenTradesCollection,
    TopTradersCollection,
    TradedPositionsCollection,
    PerformanceCollection,
    SubAccountsCollection,
    SubAccountsConfigCollection,
    // PreviousOpenTradesBeforeUpdate,
    // PreviousSubAccountConfigBeforeUpdate
} = require("./collections/");

/**
 * @typedef {{
 *      usersCollection: UsersCollection
 *      oldTradesCollection: OldTradesCollection
 *      openTradesCollection: OpenTradesCollection
 *      topTradersCollection: TopTradersCollection,
 *      tradedPositionsCollection: TradedPositionsCollection,
 *      performanceCollection: PerformanceCollection,
 *      subAccountsCollection: SubAccountsCollection,
 *      subAccountsConfigCollection: SubAccountsConfigCollection,
 * }} Collections_Interface
*/
//  *      previousOpenTradesBeforeUpdate: PreviousOpenTradesBeforeUpdate,
//  *      previousSubAccountConfigBeforeUpdate: PreviousSubAccountConfigBeforeUpdate

// import {utils} from './utils'
module.exports.MongoDatabase =  class MongoDatabase{
    static generateUIDString(){return new ObjectId().toString("base64");}
    /**
     * @type {number[]}
     */
    #intervalsIds_Array = [];
    /**
     * @type {string}
     */
    #uri = "";
    /**
     * @type {import("mongodb").MongoClient}
     */
    #client; 
    /**
     * @type {null|import("mongodb").Db}
     */
    #database = null;
    /**
     * @type {boolean}
     */
    #dbIsConnected = false;

    /**
     * @type {Collections_Interface}
     */
    collection = {
        usersCollection:null,
        oldTradesCollection:null,
        openTradesCollection: null,
        topTradersCollection:null,
        tradedPositionsCollection: null,
        performanceCollection: null,
        subAccountsCollection: null,
        subAccountsConfigCollection: null,
        // previousSubAccountConfigBeforeUpdate: null,
    };
    /**
     * @type {null|import("mongodb").ClientSession}
     */
    #session = null;
    // static utils = utils
    /**
     * 
     * @param {string} uri_ 
     */
    constructor(uri_){
        this.uri = uri_;
        this.#client = new MongoClient(this.uri,{
            
        });
    }
 
    /**
     * 
     * @param {string} databaseName 
     * @returns {boolean}
     */
    async connect(databaseName){
        try {
            if(!this.uri){
                throw new Error("Uri is required to connect");
            }else {
                // check if db already connected
                if(this.#dbIsConnected && this.#database)return true;
                await this.#client.connect();
                console.log("Client connected");
                // this.#session = this.#client.startSession();// what is this ?
                this.#dbIsConnected = true;
                this.#database = this.#client.db(databaseName);
                // const previousOpenTradesBeforeUpdate = new PreviousOpenTradesBeforeUpdate(this.#database);
                // const previousSubAccountConfigBeforeUpdate =  new PreviousSubAccountConfigBeforeUpdate(this.#database);
                this.collection = {
                    usersCollection: new UsersCollection(this.#database),
                    oldTradesCollection: new OldTradesCollection(this.#database),
                    openTradesCollection: new OpenTradesCollection(this.#database),
                    topTradersCollection: new TopTradersCollection(this.#database),
                    tradedPositionsCollection: new TradedPositionsCollection(this.#database),
                    performanceCollection: new PerformanceCollection(this.#database),
                    subAccountsCollection: new SubAccountsCollection(this.#database),
                    subAccountsConfigCollection: new SubAccountsConfigCollection(this.#database),
                    // previousOpenTradesBeforeUpdate: previousOpenTradesBeforeUpdate,
                    // previousSubAccountConfigBeforeUpdate:previousSubAccountConfigBeforeUpdate
                };
                // this.runOnInitImmediatelyAfterDBConnect = [
                // ];
                console.log("Database connected..."); 
                /**
                 * Run Initilizers
                */
                //1. Inititialize previous docs ccollections
                await this.collection.usersCollection.runOnInitImmediatelyAfterConnect();
                await this.collection.subAccountsConfigCollection.runOnInitImmediatelyAfterConnect();
                await this.collection.openTradesCollection.runOnInitImmediatelyAfterConnect();
                await this.collection.tradedPositionsCollection.runOnInitImmediatelyAfterConnect();
                
                // Ping the DB every 30 min
                // Set an interval for sending a ping message every 30 minutes (1800000 ms)
                console.log("Setting database ping");
                const interval = setInterval(() => {
                    // Send a dummy query or operation to the collection to keep the stream active
                    this.collection.usersCollection.findOne({}); // Replace with your specific query or operation
                    console.log("Ping database");
                }, 1800000);
                this.#intervalsIds_Array.push(interval);
            }

        }catch(error){
            console.log("Error connecting to database");
            throw error;
        }
    }

    clearAllIntervals(){
        this.#intervalsIds_Array.forEach((id)=>{
            clearInterval(id);
        });
    }
    

    async disconnect(){
        try {
            this.clearAllIntervals();
            if(this.#database){
                await this.#client.close();
                this.#dbIsConnected = false;
                console.log("Database connection closed.");
                return true;
            }
        }catch(error){
            console.log("Error closing database connection");
            throw error;
        }
    }



};


