const {  Db, Collection, ObjectId, ExplainVerbosityLike, DeleteResult } = require("mongodb");
const {Document: MongoDocument, ChangeStream} = require('mongodb')



module.exports.TradedPositionsCollection =  class TradedPositionsCollection{
    #COLLECTION_NAME = 'Traded_Positions';
    /**
     * @type {Db}
     */
    #database;
    /**
     * @type {Collection<import("./types").TradedPositions_Interface>}
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
            await this.#collection.createIndex('_id')
            console.log('Indexes created')
            return
        }catch(error){
            throw error;
        }
    }

    
    /**
     * 
     * @param {string[]|ObjectId[]} documentIds 
     * @returns {Promise<DeleteResult>}
     */
    async deleteManyDocumentsByIds(documentIds){
        try {
            // delete many
            const newObjectIds = documentIds.map((str)=>new ObjectId(str))
            const deleteResults = await this.#collection.deleteMany({_id:{$in: newObjectIds}})
            
            return deleteResults;
        }catch(error){
            throw error;
        }
    }


    /**
     * 
     * @param {import("./types/index").TradedPositions_Interface} doc 
     * @returns {import("./types/index").TradedPosition_Collection_Document_Interface}
     */
    async createNewDocument(doc){
        console.log(doc)
        try {
            if(!doc){
                throw new Error("No doc passed to (fn) create New Document")
            }else {
                if(!doc.server_timezone){
                    doc.server_timezone=process.env.TZ 
                }
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
     * @param {string|ObjectId} documentId 
     *
     */
    async getDocumentById(documentId){
        try {
            return await this.#collection.findOne({
                _id: new ObjectId(documentId)
            });
        }catch(error){
            console.log(error)
            throw error;
        }
    }


    /**
     * @param {ObjectId} documentId
     * @param {import("./types").TradedPositions_Interface} doc 
     * @returns {import("./types").TradedPosition_Collection_Document_Interface}
     */
    async updateDocument(documentId,doc){
        console.log(doc)
        try {
            if(!doc){
                throw new Error("No doc passed to (fn) update Document")
            }else {
               const updatedDoc =  await this.#collection.updateOne({
                _id: documentId,
               },{$set:doc});
               console.log('Doc updated')
               return updatedDoc;
            }
        }catch(error){
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
                return  await this.#collection.find({}).sort()

            }else {
                return  await this.#collection.find({}) 
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


     /**
     * 
     * @param {string} trader_uid 
     */
    // * @returns {FindCursor<>} 
     async getDocumentsByTraderUid(trader_uid){
        try {
            return await this.#collection.find({
                trader_uid:trader_uid
            });
        }catch(error){
            console.log(error)
            throw error;
        }
    }
   



}