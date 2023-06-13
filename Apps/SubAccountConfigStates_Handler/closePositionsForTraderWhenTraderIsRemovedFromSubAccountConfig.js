//@ts-check
/**
 * Marks posittions as closed in the database
 */

/**
 * @param {{
 *      trader_uid: string,
 *      mongoDatabase: import("../../MongoDatabase").MongoDatabase
 * }} param0
 */
module.exports.closePositionsForTraderWhenTraderIsRemovedFromSubAccountConfig = async function closePositionsForTraderWhenTraderIsRemovedFromSubAccountConfig({
    mongoDatabase,trader_uid
}){
    const FUNCTION_NAME = "(fn:closePositionsForTraderWhenTraderIsRemovedFromSubAccountConfig)";
    try{
        console.log(FUNCTION_NAME);
        /**
         * Get the traders open positions documents
         */
        const traderOpenPositionsDocument_Cursor = await mongoDatabase.collection.openTradesCollection.getAllDocumentsBy({
            trader_uid,
            status:"OPEN"
        });

        /**
         * Loop through the open positions documents and mark as closed by:
         * => Crerating a new oldTrades document and deleting the document from open positions
         */
        while(await traderOpenPositionsDocument_Cursor.hasNext()){
            const traderOpenPositionsDocument = await traderOpenPositionsDocument_Cursor.next();
            if(!traderOpenPositionsDocument)return;

            /**
             * Create an old trades document 
             * Doin this triggers an event that App:Executorr should ddetect and handle the closing of the positions 
             * from users sub account associated to the trader.
             */
            const positionToClose_ = traderOpenPositionsDocument;
            const datetimeNow = new Date();
            await mongoDatabase.collection.oldTradesCollection.createNewDocument({
                original_position_id: positionToClose_._id,
                close_datetime: new Date(),
                direction:positionToClose_.direction,
                entry_price: positionToClose_.entry_price,
                close_price: positionToClose_.mark_price,
                followed: positionToClose_.followed,
                copied: positionToClose_.copied,
                leverage: positionToClose_.leverage,
                mark_price: positionToClose_.mark_price,
                open_datetime: positionToClose_.open_datetime,
                original_size: positionToClose_.original_size,
                pair:positionToClose_.pair,
                part: positionToClose_.part,
                pnl: positionToClose_.pnl,
                roi: positionToClose_.roi,
                roi_percentage: positionToClose_.roi_percentage,
                size: positionToClose_.size,
                previous_size_before_partial_close: positionToClose_.previous_size_before_partial_close,
                status: "CLOSED",
                total_parts: positionToClose_.total_parts,
                trader_id: positionToClose_.trader_id,
                trader_uid: positionToClose_.trader_uid ,
                document_created_at_datetime: datetimeNow,
                document_last_edited_at_datetime: datetimeNow,
                server_timezone: process.env.TZ||"",
                    
            });
            // delete from openPositions collections
            await mongoDatabase.collection.openTradesCollection.deleteManyDocumentsByIds([positionToClose_._id]);
        }

      

    }catch(error){
        const newErrorMessage = `${FUNCTION_NAME}: ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};