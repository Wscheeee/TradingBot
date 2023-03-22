/**
 * Instatiate the database and hande db commands
 */
const { Db, MongoClient,ClientSession} = require('mongodb');
const {
    MembershipUsersCollection,
    OldTradesCollection,
    OpenTradesCollection,
    TopTradersCollection
} = require('./collections/');

/**
 * @typedef {{
 *      membershipUsersCollection: MembershipUsersCollection
 *      oldTradesCollection: OldTradesCollection
 *      openTradesCollection: OpenTradesCollection
 *      topTradersCollection: TopTradersCollection
 * }} Collections_Interface
 */

// import {utils} from './utils'
module.exports.MongoDatabase =  class MongoDatabase{
    /**
     * @type {string}
     */
    #uri = '';
    /**
     * @type {MongoClient}
     */
    #client; 
    /**
     * @type {null|Db}
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
        membershipUsersCollection:null,
        oldTradesCollection:null,
        openTradesCollection: null,
        topTradersCollection:null
    }
    /**
     * @type {null|ClientSession}
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
                throw new Error('Uri is required to connect')
            }else {
                // check if db already connected
                if(this.#dbIsConnected && this.#database)return true;
                await this.#client.connect()
                console.log("Client connected")
                this.#session = this.#client.startSession();// what is this ?
                this.#dbIsConnected = true;
                this.#database = this.#client.db(databaseName)
                this.collection = {
                    membershipUsersCollection: new MembershipUsersCollection(this.#database),
                    oldTradesCollection: new OldTradesCollection(this.#database),
                    openTradesCollection: new OpenTradesCollection(this.#database),
                    topTradersCollection: new TopTradersCollection(this.#database)
                }
                console.log('Database connected...')
                return true;
            }
        }catch(error){
            console.log('Error connecting to database')
            throw error;
        }
    }

    
    

    async disconnect(){
        try {
            if(this.database){
                await this.client.close();
                this.#dbIsConnected = false;
                console.log('Database connection closed.')
                return true;
            }
        }catch(error){
            console.log('Error closing database connection')
            throw error;
        }
    }



}


