//@ts-check
/**
 * 
 * @param {{
*    mongoDatabase: import("../../../../../MongoDatabase").MongoDatabase
*    skip: number,
*    limit: number,
*    trader_uid: string
* }} param0 
*/
module.exports.getOpenPositionsOfATrader =  async function getOpenPositionsOfATrader({mongoDatabase,limit,skip,trader_uid}){
    const FUNCTION_NAME = "getOpenPositionsOfATrader";
    try{
        const openPositionsDocuments_Cursor = await mongoDatabase.collection.openTradesCollection.getAllDocumentsBy({
            trader_uid
        });
        openPositionsDocuments_Cursor.skip(skip).limit(limit);
        const openPositiionsArray = await openPositionsDocuments_Cursor.toArray();
        return openPositiionsArray;
    }catch(error){
        const newErrorMessage = `(fn:${FUNCTION_NAME}): ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};