/**
 * Instatiate the database and hande db commands
 */
const {  MongoClient} = require("mongodb");
const {
    UsersCollection,
    OldTradesCollection,
    OpenTradesCollection,
    TopTradersCollection,
    TradedPositionsCollection,
    PerformanceCollection
} = require("./collections/");

/**
 * @typedef {{
 *      usersCollection: UsersCollection
 *      oldTradesCollection: OldTradesCollection
 *      openTradesCollection: OpenTradesCollection
 *      topTradersCollection: TopTradersCollection,
 *      tradedPositionsCollection: TradedPositionsCollection,
 *      performanceCollection: PerformanceCollection,
 * }} Collections_Interface
 */

// import {utils} from './utils'
module.exports.MongoDatabase =  class MongoDatabase{
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
        performanceCollection: null
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
        this.#client = new MongoClient(this.uri);
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
                this.#session = this.#client.startSession();// what is this ?
                this.#dbIsConnected = true;
                this.#database = this.#client.db(databaseName);
                this.collection = {
                    usersCollection: new UsersCollection(this.#database),
                    oldTradesCollection: new OldTradesCollection(this.#database),
                    openTradesCollection: new OpenTradesCollection(this.#database),
                    topTradersCollection: new TopTradersCollection(this.#database),
                    tradedPositionsCollection: new TradedPositionsCollection(this.#database),
                    performanceCollection: new PerformanceCollection(this.#database),
                };
                console.log("Database connected...");
                // Ping the DB every 30 min
                // Set an interval for sending a ping message every 30 minutes (1800000 ms)
                console.log("Setting database ping");
                setInterval(() => {
                    // Send a dummy query or operation to the collection to keep the stream active
                    this.collection.usersCollection.findOne({}); // Replace with your specific query or operation
                    console.log("Ping database");
                }, 1800000);
                return true;
            }
        }catch(error){
            console.log("Error connecting to database");
            throw error;
        }
    }

    
    

    async disconnect(){
        try {
            if(this.database){
                await this.client.close();
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


