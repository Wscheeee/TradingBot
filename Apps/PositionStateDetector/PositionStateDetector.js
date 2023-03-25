'use-strict';
//@ts-check
/**
 * @description Detects when a new position is added and when a position is resized or closed.
 * Logs in the DB and listens for document changes and creation.
 * Listens for all of the needed positions
 */

const {MongoDatabase} = require("../../MongoDatabase");
const {sleepAsync} = require("../../Utils/sleepAsync");
const {readAndConfigureDotEnv} = require("../../Utils/readAndConfigureDotEnv");
const dotEnvObj = readAndConfigureDotEnv(); 

process.env.TZ = dotEnvObj.TZ;
process.env.DATABASE_URI = dotEnvObj.DATABASE_URI;
process.env.DATABASE_NAME = dotEnvObj.DATABASE_NAME;
console.log(process.env);
const IS_LIVE = false;

module.exports.PositionsStateDetector = class PositionsStateDetector {
    /**
     * @type {MongoDatabase}
     */
    #mongoDatabase;
    /**
     * 
     * @param {{mongoDatabase:MongoDatabase}} param0 
     */
    constructor({mongoDatabase}){
        this.#mongoDatabase = mongoDatabase;
    }

    listenToOpenTradesCollection(){
        const watcher = this.#mongoDatabase.collection.openTradesCollection.watchCollection()
        watcher.addListener("change",(change)=>{
            change.
            if(change.operationType==="create"){
                // new position added
                const newPositionDocument = change.operationType
                this.onNewPosition()
            }else if(change.operationType==="update"){
                // Position updated
                // Check the for immportant updates to note
            }
        })
    };


    listenToOldTradesCollection(){
        const watcher = this.#mongoDatabase.collection.oldTradesCollection.watchCollection()
        watcher.addListener("change",(change)=>{
            if(change.operationType==="create"){
                // a position has been partiall close or wholly closed.

            };
        }) 
    }

    // Events
    onNewPosition(){

    }
    onPositionClose(){

    }
    onPositionResize(){

    }
}