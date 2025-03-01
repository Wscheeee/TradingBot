//@ts-check


/**
 * 
 * @param {{
 *    traderDocument: import("../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface
 *    mongoDatabase:  import("../../MongoDatabase").MongoDatabase,
 *    estimated_total_balance : number
 *}} param0 
 */
module.exports.saveTraderEstimatedTotalTodayBalance = async function saveTraderEstimatedTotalTodayBalance({
    mongoDatabase,estimated_total_balance,traderDocument
}){
    const FUNCTION_NAME = "(fn:saveTraderEstimatedTotalTodayBalance)";
    console.log(FUNCTION_NAME);
    try{

        const updateResult = await mongoDatabase.collection.topTradersCollection.updateDocument(traderDocument._id,{
            today_estimated_balance: estimated_total_balance
        });
        console.log({updateResult});
        return;

    }catch(error){
        const newErrorMessage = `${FUNCTION_NAME}: ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }

};