const {  ObjectId } = require("mongodb");



module.exports.UsedAllocationsCollection =  class UsedAllocationsCollections{
    /**
     * @type {string}
     */
    #COLLECTION_NAME = "Used_Allocations";
    /**
     * @type {Db}
     */
    #database;
    /**
     * @type {import("mongodb").Collection<import("./types").Used_Allocation_Document_Interface>}
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
        await this.#collection.createIndex(["id"],{unique:true});
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
     * @param {import("./types").Used_Allocation_Document_Interface} doc 
     * @returns {import("./types").Used_Allocation_Collection_Document_Interface}
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
     * @param {import("./types").Used_Allocation_Document_Interface} doc 
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

   

    // added
    watchCollection(){
        console.log("Setting watch listener");
        const eventListenter =  this.#collection.watch();
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
     */
    async getDocumentByTraderUid(uid){
        return await this.#collection.findOne({
            uid:uid
        });
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
     * @param {import("mongodb").Filter<import("./types").Used_Allocation_Document_Interface>} filter
     */
    async findOne(filter){
        return await this.#collection.findOne(filter);
    }

    /**
     * @param {import("mongodb").Filter<import("./types").Used_Allocation_Document_Interface>} by
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