const { MongoClient, Db, Collection, ObjectId, ExplainVerbosityLike, DeleteResult } = require("mongodb");
const {Document: MongoDocument, ChangeStream} = require('mongodb')
const {OldTrades_Interface,OldTrades_Collection_Document_Interface} = require("./types/index")


module.exports.OldTradesCollection =  class OldTradesCollection{
    #COLLECTION_NAME = 'Old_Trades';
    /**
     * @type {Db}
     */
    #database;
    /**
     * @type {Collection<import("./types/index").OldTrades_Collection_Document_Interface>}
     */
    #collection;
    /**
     * @type {ChangeStream[]}
     */
    #eventListenersArray = [];


    /**
     * 
     * @param {Db} database 
     */
    constructor(database){
        this.#database = database;
        this.#collection = this.#database.collection(this.#COLLECTION_NAME)
    }
    
    async createIndexes(){
        try {
            // await this.#collection.createIndex({})
            console.log('Indexes created')
        }catch(error){
            throw error;
        }
    }

    
    /**
     * 
     * @param {string[]|ObjectId[]} ids 
     * @returns {Promise<DeleteResult>}
     */
    async deleteManyDocumentsByIds(ids){
        try {
            // delete many
            const newObjectIds = ids.map((str)=>new ObjectId(str))
            const deleteResults = await this.#collection.deleteMany({_id:{$in: newObjectIds}})
            
            return deleteResults;
        }catch(error){
            throw error;
        }
    }


    /**
     * 
     * @param {OldTrades_Interface} doc 
     */
    async createNewDocument(doc){
        console.log(doc)
        try {
            if(!doc){
                throw new Error("No doc passed to (fn) create New Document")
            }else {
                // if(!doc.server_timezone){
                //     doc.server_timezone=process.env.TZ 
                // }
               const insertedDoc =  await this.#collection.insertOne(doc);
               console.log('Doc inserted')
               return insertedDoc;
            }
        }catch(error){
            throw error;
        }
    }

   

    // added
    watchCollection(){
        console.log('Setting watch listener')
        const eventListenter =  this.#collection.watch()
        this.#eventListenersArray.push(eventListenter);
        return eventListenter;
    }

    async releaseAllEventListeners(){
        try {
            for(const listener in this.#eventListenersArray){
                await listener.removeAllListeners()
            }
            return;
        }catch(error){
            throw error;

        }
    }
    
    /**
     * 
     * @param {string|ObjectId} id 
     */
    async getDocumentById(id){
        try {
            return await this.#collection.findOne({
                _id: new ObjectId(id)
            });
        }catch(error){
            console.log(error)
            throw error;
        }
    }


    /**
     * 
     * @param {boolean} sort 
     * @returns 
     */
    async getAllDocuments(sort=true){
        try {

            if(sort){
                return await  this.#collection.find({}).sort()

            }else {
                return await  this.#collection.find({}) 
            }
        }catch(error){
            throw error;
        }
    }
  

  
    /**
     * 
     * @param {ExplainVerbosityLike} verbosity 
     * @returns 
     */
    async explainGetAllDocument(verbosity){
        try {
            // const a:ExplainVerbosityLike  = ""
            return  await this.#collection.find({}).explain(verbosity||true)
        }catch(error){
            throw error;
        }
    }

   



}