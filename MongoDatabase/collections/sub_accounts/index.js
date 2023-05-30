const { ObjectId } = require("mongodb");

module.exports.SubAccountsCollection =  class SubAccountsCollection{
    #COLLECTION_NAME = "Sub_Accounts";
    /**
     * @type {import("mongodb").Db}
     */
    #database;
    /**
     * @type {import("mongodb").Collection<import("./types").Sub_Account_Document_Interface>}
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
        await this.#collection.createIndex(["_id"],{unique:true});
        console.log("Indexes created");
    }

    get collectionName(){
        return this.#COLLECTION_NAME;
    }
    /**
     * 
     * @param {string[]|import("mongodb").ObjectId[]} ids 
     * @returns {Promise<import("mongodb").DeleteResult>}
     */
    async deleteManyDocumentsByIds(ids){
        // delete many
        const newObjectIds = ids.map((str)=>new ObjectId(str));
        const deleteResults = await this.#collection.deleteMany({_id:{$in: newObjectIds}});
        return deleteResults;
    }


    /**
     * 
     * @param {import("./types").Sub_Account_Document_Interface} doc 
     */
    async createNewDocument(doc){
        console.log(doc);
        if(!doc){
            throw new Error("No doc passed to (fn) create New Document");
        }else {
            if(!doc.server_timezone){
                doc.server_timezone=process.env.TZ;
            }
            if(!doc.document_created_at_datetime){
                doc.document_created_at_datetime = new Date();
            }
            const insertedDoc =  await this.#collection.insertOne(doc);
            console.log("Doc inserted");
            return insertedDoc;
        }
    }

    /**
     * @param {import("mongodb").ObjectId} documentId
     * @param {import("mongodb").Filter<import("./types").Sub_Account_Document_Interface>} doc 
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
        // eventListenter.addListener("close",()=>{
        //     console.log(this.#COLLECTION_NAME+" Stream Closed");
        // });
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


    /**
     * 
     * @param {boolean} sort 
     * @returns 
     */
    async getAllDocuments(sort=true){
        if(sort){
            return await this.#collection.find({}).sort();
        }else {
            return  await this.#collection.find({}); 
        }
    }

    /**
     * @param {import("mongodb").Filter<import("./types").Sub_Account_Document_Interface>} by 
     * @param {boolean?} sort 
     */
    async getAllDocumentsBy(by={},sort=true){
        if(sort){
            return await  this.#collection.find(by).sort();
        }else {
            return await  this.#collection.find(by); 
        }
    }

    /**
     * @param {import("mongodb").Filter<import("./types").Sub_Account_Document_Interface>} filter
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

   



};