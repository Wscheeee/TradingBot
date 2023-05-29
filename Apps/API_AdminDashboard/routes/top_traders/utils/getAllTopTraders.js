//@ts-check
/**
 * 
 * @param {{
 *    mongoDatabase: import("../../../../../MongoDatabase").MongoDatabase
 *    skip: number,
 *    limit: number
 * }} param0 
 */
module.exports.getAllTopTraders =  async function getAllTopTraders({mongoDatabase,limit,skip}){
    const FUNCTION_NAME = "getAllTopTraders";
    try{
        const topTradersDocuments_Cursor = await mongoDatabase.collection.topTradersCollection.getAllDocuments();
        topTradersDocuments_Cursor.skip(skip).limit(limit);
        const topTradersArray = await topTradersDocuments_Cursor.toArray();
        return topTradersArray;
    }catch(error){
        const newErrorMessage = `(fn:${FUNCTION_NAME}): ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};