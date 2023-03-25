const { MongoClient, Db, Collection, ObjectId, ExplainVerbosityLike, DeleteResult } = require("mongodb");
const {Document: MongoDocument, ChangeStream} = require('mongodb')
const {TopTrader_Interface,TopTraderCollection_Document_Interface} = require("./types/index")



module.exports.TopTradersCollection =  class TopTradersCollection{
    /**
     * @type {string}
     */
    #COLLECTION_NAME = 'Top_Traders';
    /**
     * @type {Db}
     */
    #database;
    /**
     * @type {Collection<TopTraderCollection_Document_Interface>}
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
            await this.#collection.createIndex('game_round_name')
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
     * @param {TopTrader_Interface} doc 
     * @returns {TopTraderCollection_Document_Interface}
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

    


    /**
     * @param {ObjectId} documentId
     * @param {TopTrader_Interface} doc 
     * @returns {TopTraderCollection_Document_Interface}
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
     * @returns {Promise<WithId<TopTrader_Interface> | null> }
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

    async getAllFollowedTraders(){
        try {
            return this.#collection.find({
                followed: true
            });
        }catch(error){
            console.log(error)
            throw error;
        }
    }


     /**
     * 
     * @param {string} uid 
     * @returns {Promise<TopTraderCollection_Document_Interface|null>}
     */
     async getDocumentByTraderUid(uid){
        try {
            return await this.#collection.findOne({
                uid:uid
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

   



}