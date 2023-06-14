const {  ObjectId } = require("mongodb");



module.exports.TopTradersCollection =  class TopTradersCollection{
    /**
     * @type {string}
     */
    #COLLECTION_NAME = "Top_Traders";
    /**
     * @type {Db}
     */
    #database;
    /**
     * @type {import("mongodb").Collection<import("./types").TopTraderDocument_Interface>}
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
        await this.#collection.createIndex(["uid"],{unique:true});
        console.log("Indexes created");
    }

    
    /**
     * 
     * @param {string[]|import("mongodb").ObjectId[]} ids 
     */
    async deleteManyDocumentsByIds(ids){
        // delete many
        const newObjectIds = ids.map((str)=>new ObjectId(str));
        const deleteResults = await this.#collection.deleteMany({_id:{$in: newObjectIds}});
        return deleteResults;
    }


    /**
     * 
     * @param {import("./types").TopTraderDocument_Interface} doc 
     * @returns {import("./types").TopTraderCollection_Document_Interface}
     */
    async createNewDocument(doc){
        if(!doc){
            throw new Error("No doc passed to (fn) create New Document");
        }else {
            // if(!doc.server_timezone){
            //     doc.server_timezone=process.env.TZ 
            // }
            const insertedDoc =  await this.#collection.insertOne(doc);
            console.log("Doc inserted");
            return insertedDoc;
        }
    }

    


    /**
     * @param {import("mongodb").ObjectId} documentId
     * @param {import("mongodb").Filter<import("./types").TopTraderDocument_Interface>} doc
     */
    async updateDocument(documentId,doc){
        console.log(doc);
        if(!doc){
            throw new Error("No doc passed to (fn) update Document");
        }else {
            const updateResult =  await this.#collection.updateOne({
                _id: documentId,
            },{$set:doc});
            console.log("Doc updated");
            return updateResult;
        }
    }

   

    // added
    watchCollection(){
        console.log("Setting watch listener");
        const eventListenter =  this.#collection.watch(undefined,{
            fullDocumentBeforeChange:"whenAvailable"
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
     * @param {string|import("mongodb").ObjectId} id 
     * @returns {Promise<import("mongodb").WithId<import("./types").TopTraderDocument_Interface> | null> }
     */
    async getDocumentById(id){
        return await this.#collection.findOne({
            _id: new ObjectId(id)
        });
    }

    async getAllFollowedTraders(){
        return this.#collection.find({
            followed: true
        });
    }


    /**
     * 
     * @param {string} uid 
     * @returns {Promise<import("./types").TopTraderCollection_Document_Interface|null>}
     */
    async getDocumentByTraderUid(uid){
        return await this.#collection.findOne({
            uid:uid
        });
    }


    /**
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
     * @param {import("mongodb").filter<import("./types").TopTraderDocument_Interface>} filter
     */
    async findOne(filter){
        return await this.#collection.findOne(filter);
    }

    /**
     * @param {import("./types").TopTraderCollection_Document_Interface} by
     * @param {boolean} sort 
     * @returns 
     */
    async getAllDocumentsBy(by={},sort=true){
        if(sort){
            return  await this.#collection.find(by).sort();

        }else {
            return  await this.#collection.find(by); 
        }
    }
  

  
    /**
     * 
     * @param {import("mongodb").ExplainVerbosityLike} verbosity 
     * @returns 
     */
    async explainGetAllDocument(verbosity){
        return  await this.#collection.find({}).explain(verbosity||true);
    }

   

};