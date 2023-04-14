const { ObjectId } = require("mongodb");





module.exports.OpenTradesCollection =  class OpenTradesCollection{
    #COLLECTION_NAME = "Open_Trades";
    /**
     * @type {import("mongodb").Db}
     */
    #database;
    /**
     * @type {import("mongodb").Collection<import("./types").OpenTrades_Collection_Document_Interface>}
     */
    #collection;
    /**
     * @type {import("mongodb").ChangeStream[]}
     */
    #eventListenersArray = [];


    /**
     * 
     * @param {import("mongodb").Db} database 
     */
    constructor(database){
        this.#database = database;
        this.#collection = this.#database.collection(this.#COLLECTION_NAME);
    }
    
    async createIndexes(){
        await this.#collection.createIndex("_id");
        console.log("Indexes created");
        return;
    }

    
    /**
     * 
     * @param {string[]|import("mongodb").ObjectId[]} documentIds 
     * @returns {Promise<import("mongodb").DeleteResult>}
     */
    async deleteManyDocumentsByIds(documentIds){
        // delete many
        const newObjectIds = documentIds.map((str)=>new ObjectId(str));
        const deleteResults = await this.#collection.deleteMany({_id:{$in: newObjectIds}});
        return deleteResults;
    }


    /**
     * 
     * @param {import("./types").OpenTrades_Interface} doc 
     * @returns {import("./types").OpenTrades_Collection_Document_Interface}
     */
    async createNewDocument(doc){
        console.log(doc);
        if(!doc){
            throw new Error("No doc passed to (fn) create New Document");
        }else {
            if(!doc.server_timezone){
                doc.server_timezone=process.env.TZ; 
            }
            const insertedDoc =  await this.#collection.insertOne(doc);
            console.log("Doc inserted");
            return insertedDoc;
        }
    }

   

    // added
    watchCollection(){
        console.log("Setting watch listener");
        const eventListenter =  this.#collection.watch(undefined,{
            fullDocumentBeforeChange:"whenAvailable",
            fullDocument: "updateLookup"
        });
        this.#eventListenersArray.push(eventListenter);
        return eventListenter;
    }

    async releaseAllEventListeners(){
        for(const listener in this.#eventListenersArray){
            await listener.removeAllListeners();
        }
        return;
    }
    
    /**
     * 
     * @param {string|import("mongodb").ObjectId} documentId 
     *
     */
    async getDocumentById(documentId){
        return await this.#collection.findOne({
            _id: new ObjectId(documentId)
        });
    }


    /**
     * @param {import("mongodb").ObjectId} documentId
     * @param {import("./types").OpenTrades_Interface} doc 
     * @returns {import("./types").OpenTrades_Collection_Document_Interface}
     */
    async updateDocument(documentId,doc){
        console.log(doc);
        if(!doc){
            throw new Error("No doc passed to (fn) update Document");
        }else {
            const updatedDoc =  await this.#collection.updateOne({
                _id: documentId,
            },{$set:doc});
            console.log("Doc updated");
            return updatedDoc;
        }
    }

    /**
     * 
     * @param {boolean} sort 
     * @returns 
     */
    async getAllDocuments(sort=true){
        if(sort){
            return  await this.#collection.find({}).sort();

        }else {
            return  await this.#collection.find({}); 
        }
    }

    /**
     * @param {import("./types").OpenTrades_Interface} by 
     * @param {boolean?} sort 
     * @returns 
     */
    async getAllDocumentsBy(by={},sort=true){
        if(sort){
            return await  this.#collection.find(by).sort();
        }else {
            return await  this.#collection.find(by); 
        }
    }
  
    /**
     * @param {import("./types").OpenTrades_Interface} filter
     */
    async findOne(filter){
        return await this.#collection.findOne(filter);
    }

  
    /**
     * 
     * @param {import("mongodb").ExplainVerbosityLike} verbosity 
     * @returns 
     */
    async explainGetAllDocument(verbosity){
        return  await this.#collection.find({}).explain(verbosity||true);
    }


    /**
     * 
     * @param {string} trader_uid 
     */
    // * @returns {FindCursor<>} 
    //* @returns {OpenTrades_Collection_Document_Interface[]|null}
    async getDocumentsByTraderUid(trader_uid){
        try {
            return await this.#collection.find({
                trader_uid:trader_uid
            });
        }catch(error){
            console.log(error);
            throw error;
        }
    }
   



};