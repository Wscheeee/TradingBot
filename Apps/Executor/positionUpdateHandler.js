const {percentageBased_DynamicPositionSizingAlgo} = require("./algos/qty");

/**
 * 
 * @param {{
*      bybit: import("../../Trader").Bybit,
*      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
*      logger: import("../../Logger").Logger,
*      positionsStateDetector: import("../../MongoDatabase").PositionsStateDetector
* }} param0 
*/
module.exports.positionUpdateHandler = async function positionUpdateHandler({
    bybit,logger,mongoDatabase,positionsStateDetector
}){
    console.log("fn:positionUpdateHandler");
    positionsStateDetector.onUpdatePosition(async (position, trader) => {
        logger.info("Position updated On DB");
        try {
            // get the open position 
            logger.info("Getting a list of positions from bybit_RestClientV5");
            const openPositionsRes = await bybit.clients.bybit_RestClientV5.getOpenPositions({
                category:"linear",
                symbol:position.pair
            });
            logger.info("Got a list of positions from bybit_RestClientV5");
            console.log({openPositionsRes});
            //@todo: handle errors
            if(openPositionsRes.result && openPositionsRes.result.list && openPositionsRes.result.list.length>0){
                logger.info("The list of positions from bybit_RestClientV5 has a position");
                for(const positionInExchange of openPositionsRes.result.list){
                    console.log({positionInExchange});
                    if(positionInExchange.side==="None"){
                        logger.info("The position has a side===None");
                    }
                    // as the query includes symbol and only one position per symbol is handled
                    // Calculate the new qty
                    logger.info("Calculate percentageBased_DynamicPositionSizingAlgo");
                    const {standardized_qty,trade_allocation_percentage} = await percentageBased_DynamicPositionSizingAlgo({
                        bybit,position,trader
                    });
                    logger.info("Sending an order to update the position at bybit_RestClientV5");
                    const updatePositionRes = await bybit.clients.bybit_RestClientV5.updateAPosition({
                        category:"linear",
                        orderType:"Market",
                        qty:String(standardized_qty),
                        side: position.direction==="LONG"?"Buy":"Sell",
                        symbol: position.pair,
                    });
                    if(!updatePositionRes ||!updatePositionRes.result|| !updatePositionRes.result.orderId){
                        throw new Error(updatePositionRes.retMsg);
                    }
                    logger.info("Updated the position at bybit_RestClientV5");
                    console.log({updatePositionRes});
                    // update the TradedTrades db document
                    const tradedOpenPositionDocument = await mongoDatabase.
                        collection.
                        tradedPositionsCollection.
                        getOneOpenPositionBy({
                            direction:position.direction,
                            pair: position.pair,
                            trader_uid: trader.uid
                        });
                    logger.info("Return from mongoDatabase.collection.tradedPositionsCollection.getOneOpenPositionBy");
                    if(!tradedOpenPositionDocument){
                        logger.warn("Position open in Bybit is not found in DB");
                    }else {
                        logger.info("Position in Bybit found in DB");
                        await mongoDatabase.collection.tradedPositionsCollection.
                            updateDocument(tradedOpenPositionDocument._id,{
                                close_price: bybit.getPositionClosePrice(positionInExchange,"Linear"),
                                closed_pnl: bybit.calculatePositionPNL(positionInExchange),
                                closed_roi_percentage: bybit.calculatePositionROI(positionInExchange),
                                entry_price: bybit.getPositionEntryPrice(positionInExchange),
                                leverage: bybit.getPositionLeverage(positionInExchange),
                                pair: position.pair,
                                position_id_in_oldTradesCollection: null,
                                position_id_in_openTradesCollection: position._id,
                                server_timezone: process.env.TZ,
                                size: bybit.getPositionSize(positionInExchange),
                                status: "OPEN",
                                trader_uid: trader.uid,
                                trader_username: trader.username,
                                allocation_percentage: trade_allocation_percentage,
                                document_last_edited_at_datetime: new Date()
                            });
                        logger.info("Updated position in tradedPositionCollection db");
                    }
                    
                }
            
            }else {
                logger.info("No position matching the update found in bybit_RestClientV5 positions");
            }

        }catch(error){
            console.log({error});
            logger.error(JSON.stringify(error.message));
        }
    });

};