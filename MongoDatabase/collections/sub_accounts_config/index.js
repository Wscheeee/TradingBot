//@ts-check
const { ObjectId } = require("mongodb");

module.exports.SubAccountsConfigCollection =  class SubAccountsConfigCollection{
    #COLLECTION_NAME = "Sub_Accounts_Config";
    /**
     * @type {import("mongodb").Db}
     */
    #database;
    /**
     * @type {import("mongodb").Collection<import("./types").Sub_Account_Config_Document_Interface>}
     */
    #collection;
    /**
     * @type {import("mongodb").ChangeStream[]}
     */
    #eventListenersArray = [];

    /**
     * @type {import("../previous_sub_account_config_before_update").PreviousSubAccountConfigBeforeUpdate }
     */
    previousSubAccountConfigBeforeUpdate_Collection;

    /**
     * 
     * @param {import("mongodb").Db} database 
     * @param {import("../previous_sub_account_config_before_update").PreviousSubAccountConfigBeforeUpdate } previousSubAccountConfigBeforeUpdate_Collection 
     */
    constructor(database,previousSubAccountConfigBeforeUpdate_Collection){
        this.#database = database;
        this.#collection = this.#database.collection(this.#COLLECTION_NAME);
        this.previousSubAccountConfigBeforeUpdate_Collection = previousSubAccountConfigBeforeUpdate_Collection;

        this.#initPreviousSubAcccountConfigBeforeUpdateCollection().then(_=>{
            console.log("Finished executing::: #initPreviousSubAcccountConfigBeforeUpdateCollection");
        }).catch(error=>{
            console.log("Error:",error);
        });

    }
    
    async #initPreviousSubAcccountConfigBeforeUpdateCollection(){
        /**
         * Read the Documents and create new document in previousSubAccountConfigBeforeUpdate_Collection if not exist
         */
        try{
            console.log("executing::: #initPreviousSubAcccountConfigBeforeUpdateCollection");
            const allDocuments_Cursor  = await this.getAllDocuments();
            while(await allDocuments_Cursor.hasNext()){
                const document = await allDocuments_Cursor.next();
                console.log({document});
                if(!document)return;
                // If document is not saved in previousSubAccountConfigBeforeUpdate_Collection: create
                const documentInPreviousSubAccountConfigBeforeUpdateCollection = await this.previousSubAccountConfigBeforeUpdate_Collection.findOne({original_document_id:document._id});
                console.log({documentInPreviousSubAccountConfigBeforeUpdateCollection});
                if(!documentInPreviousSubAccountConfigBeforeUpdateCollection){
                    const createResult = await this.previousSubAccountConfigBeforeUpdate_Collection.createNewDocument({
                        original_document_id:document._id,
                        sub_link_name: document.sub_link_name,
                        trader_uid: document.trader_uid,
                        trader_username: document.trader_username,
                        weight: document.weight
                    });
                    console.log("previousSubAccountConfigBeforeUpdate_Collection.createNewDocument createResult:",createResult);
                }
            }
        }catch(error){
            const newErrorMessage = `(fn:#initPreviousSubAcccountConfigBeforeUpdateCollection) ${error.message}`;
            error.message = newErrorMessage;
            throw error;
        }
    }

    async createIndexes(){
        await this.#collection.createIndex(["_id","sub_link_name"],{unique:true});
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
        for(const id of ids){
            await this.#saveDocumentInDB_In_previousDocumentBeforeUpdateCollection(id);

            // delete the previousDocumentBeforeUpdateCollection document after some time
            const timeout = setTimeout(async ()=>{
                try{
                    clearTimeout(timeout);
                    const deleteResult =await this.previousSubAccountConfigBeforeUpdate_Collection.deleteManyDocumentsByIds([id]);
                    console.log({deleteResult});
                }catch(error){
                    const newErrorMessage = `(method:deleteManyDocumentsByIds): ${error.message}`;
                    console.log(newErrorMessage);
                }
            },(1000*60));// 1 min
        }
        // delete many
        const newObjectIds = ids.map((str)=>new ObjectId(str));
        const deleteResults = await this.#collection.deleteMany({_id:{$in: newObjectIds}});
        return deleteResults;
    }


    /**
     * 
     * @param {import("./types").Sub_Account_Config_Document_Interface} doc 
     */
    async createNewDocument(doc){
        console.log(doc);
        if(!doc){
            throw new Error("No doc passed to (fn) create New Document");
        }else {
            // if(!doc.server_timezone){
            //     doc.server_timezone=process.env.TZ;
            // }
            // if(!doc.document_created_at_datetim){
            //     doc.document_created_at_datetim = new Date();
            // }
            const insertedDoc =  await this.#collection.insertOne(doc);
            console.log("Doc inserted");
            return insertedDoc;
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
        for(const listener of this.#eventListenersArray){
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
     * @param {import("mongodb").Filter<import("./types").Sub_Account_Config_Document_Interface>} by 
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
     * @param {import("mongodb").Filter<import("./types").Sub_Account_Config_Document_Interface>} filter
     */
    async findOne(filter){
        return await this.#collection.findOne(filter);
    }

    /**
     * @param {import("mongodb").ObjectId|string} documentId
     */
    async #saveDocumentInDB_In_previousDocumentBeforeUpdateCollection(documentId){
        try{
            if(!documentId)throw new Error("documentId mustt be passed in");
            const documentId_as_ObjectId = typeof documentId==="string"?new ObjectId(documentId):documentId;
            const previousDocumentBeforeUpdate = await this.findOne({_id:documentId_as_ObjectId});
            if(!previousDocumentBeforeUpdate)throw new Error(`previousDocumentBeforeUpdate not found previousDocumentBeforeUpdate:${previousDocumentBeforeUpdate}`);
            console.log({previousDocumentBeforeUpdate});
            // Delete the previous saved document before update
            const previous_previousDocumentBeforeUpdate = await this.previousSubAccountConfigBeforeUpdate_Collection.findOne({original_document_id: documentId_as_ObjectId});
            console.log({previous_previousDocumentBeforeUpdate});
            if(previous_previousDocumentBeforeUpdate){
                console.log("Deleting previous_previousDocumentBeforeUpdate");
                const deleteManyDocumentsByIds_Result = await this.previousSubAccountConfigBeforeUpdate_Collection.deleteManyDocumentsByIds([previous_previousDocumentBeforeUpdate._id]);
                console.log("Deleted previous_previousDocumentBeforeUpdate",{deleteManyDocumentsByIds_Result});
            }
            // Save the previousDocumentBeforeUpdate
            /**
             * @type {import("../previous_sub_account_config_before_update/types").Previous_SubAccountConfig_Before_Update_Document_Interface}
             */
            const previousDocumentBeforeUpdate_payloadDoc = {
                ...previousDocumentBeforeUpdate,
                original_document_id: documentId_as_ObjectId
            }; 
            //@ts-ignore
            delete previousDocumentBeforeUpdate_payloadDoc._id;
            console.log({previousDocumentBeforeUpdate_payloadDoc});
            const insertResult = await this.previousSubAccountConfigBeforeUpdate_Collection.createNewDocument(previousDocumentBeforeUpdate_payloadDoc);
            console.log("Inserted: insertResult",{insertResult});
        }catch(error){
            const newErrorMessage = `(method:#saveDocumentInDB_In_previousDocumentBeforeUpdateCollection) ${error.message}`;
            error.message = newErrorMessage;
            throw error;
        }
    }


    /**
     * @param {import("mongodb").ObjectId|string} documentId
     * @param {import("mongodb").UpdateFilter<import("./types").Sub_Account_Config_Document_Interface>} doc 
     */
    async updateDocument(documentId,doc){
        try{
            console.log("(fn:updateDocument)");
            console.log(doc,documentId);
            if(!doc){
                throw new Error("No doc passed to (fn) update Document");
            }else {
                const documentId_as_ObjectId = typeof documentId==="string"?new ObjectId(documentId):documentId;
                // get previousDocument b4 update
                this.#saveDocumentInDB_In_previousDocumentBeforeUpdateCollection(documentId_as_ObjectId);
            
                // Perform the update
                const updatedDoc =  await this.#collection.updateOne({
                    _id: documentId_as_ObjectId
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
     * @param {import("mongodb").ExplainVerbosityLike} verbosity 
     * @returns 
     */
    async explainGetAllDocument(verbosity){
        return  await this.#collection.find({}).explain(verbosity||true);
    }




   



};