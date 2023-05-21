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
     * @type {import("../previous_open_trades_before_update").PreviousOpenTradesBeforeUpdate }
     */
    previousOpenTradesBeforeUpdate_Collection;

    /**
     * 
     * @param {import("mongodb").Db} database 
     * @param {import("../previous_open_trades_before_update").PreviousOpenTradesBeforeUpdate } previousOpenTradesBeforeUpdate_Collection 
     */
    constructor(database,previousOpenTradesBeforeUpdate_Collection){
        this.#database = database;
        this.#collection = this.#database.collection(this.#COLLECTION_NAME);
        this.previousOpenTradesBeforeUpdate_Collection = previousOpenTradesBeforeUpdate_Collection;
        
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
     * @param {import("mongodb").UpdateFilter<import("./types").OpenTrades_Interface>} doc 
     */
    async updateDocument(documentId,doc){
        try{
            console.log("(fn:updateDocument)");
            console.log(doc);
            if(!doc){
                throw new Error("No doc passed to (fn) update Document");
            }else {
                // get previousDocument
                const previousDocumentBeforeUpdate = await this.findOne({_id:documentId});
                if(!previousDocumentBeforeUpdate)throw new Error(`previousDocumentBeforeUpdate not found previousDocumentBeforeUpdate:${previousDocumentBeforeUpdate}`);
    
                // Save the previousDocumentBeforeUpdate
                /**
                 * @type {import("../previous_open_trades_before_update/types").Previous_OpenTrades_Before_Update_Interface}
                 */
                const previousDocumentBeforeUpdate_payloadDoc = {
                    ...previousDocumentBeforeUpdate,
                    original_document_id: documentId
                };
                delete previousDocumentBeforeUpdate_payloadDoc._id;
                const insertResult = await this.previousOpenTradesBeforeUpdate_Collection.createNewDocument(previousDocumentBeforeUpdate_payloadDoc);
                
                // detele document in previousDocumentsForUpdates_Object after being saved for 10 seconds;
                const timeout = setTimeout(async ()=>{
                    clearTimeout(timeout);
                    console.log(`Deleting document in previousOpenTradesBeforeUpdate_Collection: ${insertResult}`);
                    const deleteResult = await this.previousOpenTradesBeforeUpdate_Collection.deleteManyDocumentsByIds([insertResult.insertedId]);
                    console.log({deleteResult});
                },(1000,10));
                // Perform the update
                const updatedDoc =  await this.#collection.updateOne({
                    _id: documentId,
                },{$set:doc});
                console.log("Doc updated");
                return updatedDoc;
            }

        }catch(error){
            const newErrorMessage = `[class:OpenTradesCollection] ${error.message}`;
            error.message = newErrorMessage;
            throw error;
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
     * @param {import("mongodb").Filter<import("./types").OpenTrades_Interface>} filter
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