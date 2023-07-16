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
        // const ratio = new Decimal(1).div(traderDocument.daily_roi);
        // let estimateDaily = new Decimal(traderDocument.daily_pnl).mul(ratio);

        // // Make sure estimateDaily is always positive
        // estimateDaily = estimateDaily.abs();

        // today_estimated_balance = estimateDaily + totalPositionsValue

        // Get trader open positions and accumulate their values
        const traderOpenPositionsDocuments_Cursor = await mongoDatabase.collection.openTradesCollection.getAllDocumentsBy({
            trader_uid: traderDocument.uid,
            status:"OPEN"
        });
        let totalPositionsValue = 0;
        while(await traderOpenPositionsDocuments_Cursor.hasNext()){
            const position = await traderOpenPositionsDocuments_Cursor.next();
            if(position){
                const positionValue = new DecimalMath(position.size).multiply(position.entry_price).divide(position.leverage).getResult();
                totalPositionsValue+=positionValue;
            }
        }
        const ratio = new DecimalMath(1).divide(traderDocument.daily_roi).getResult();
        let estimateDaily = new DecimalMath(traderDocument.daily_pnl).multiply(ratio).getResult();
        // Make sure estimateDaily is always positive
        estimateDaily = Math.abs(estimateDaily);
        const today_estimated_balance = estimateDaily - totalPositionsValue;
        return today_estimated_balance;

    }catch(error){
        const newErrorMessage = `${FUNCTION_NAME}: ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};