//@ts-check


const {DecimalMath} = require("../../../../DecimalMath");
/**
 * @param {{
 *      traderDocument: import("../types").TopTraderCollection_Document_Interface,
 *      mongoDatabase: import("../../../MongoDatabase").MongoDatabase
 * }} param0
 */
module.exports.estimateTotalTraderBalance = async function estimateTotalTraderBalance({
    traderDocument,
    mongoDatabase
}){
    const FUNCTION_NAME = "(fn:estimateTotalTraderBalance)";
    console.log(FUNCTION_NAME);
    try {
        const traderDailyPNL = traderDocument.daily_pnl;
        // Get trader open positions and accumulate their values
        const traderOpenPositionsDocuments_Cursor = await mongoDatabase.collection.openTradesCollection.getAllDocumentsBy({
            trader_uid: traderDocument.uid,
            status:"OPEN"
        });
        let totalPositionsValue = 0;
        while(await traderOpenPositionsDocuments_Cursor.hasNext()){
            const position = await traderOpenPositionsDocuments_Cursor.next();
            if(position){
                const positionValue = new DecimalMath(position.size).multiply(position.entry_price).getResult();
                totalPositionsValue+=positionValue;
            }
        }

        const totalEstimatedBalance = traderDailyPNL+totalPositionsValue;
        return totalEstimatedBalance;

    }catch(error){
        const newErrorMessage = `${FUNCTION_NAME}: ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};