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
module.exports.newPositionHandler = async function newPositionHandler({
    bybit,logger,mongoDatabase,positionsStateDetector
}){
    console.log("fn:newPositionHandler");
    positionsStateDetector.onNewPosition(async (position, trader) => {
        logger.info("New Position Added To DB");
        try{
            logger.info("Calculate percentageBased_DynamicPositionSizingAlgo");
            const {standardized_qty,trade_allocation_percentage} = await percentageBased_DynamicPositionSizingAlgo({
                bybit,position,trader
            });
            logger.info("Sending openANewPosition Order to bybit_RestClientV5");
            const openPositionRes = await bybit.clients.bybit_RestClientV5.openANewPosition({
                category:"linear",
                orderType:"Market",
                qty:String(standardized_qty),//String(symbolInfo.lot_size_filter.min_trading_qty),
                side: position.direction==="LONG"?"Buy":"Sell",
                symbol: position.pair,
                
            });
            logger.info("Got response from openANewPosition Order from bybit_RestClientV5");
            console.log({openPositionRes});
            if(openPositionRes.result.orderId){
                logger.info("The openANewPosition response has a orderId Meaning order was successfull");
                logger.info("Getting a list of open positions from bybit_RestClientV5");
                const getOpenPositions_Res = await bybit.clients.bybit_RestClientV5.getOpenPositions({
                    category:"linear",
                    symbol:position.pair
                });
                logger.info("Got a list of open positions from bybit_RestClientV5");
                console.log({getOpenPositions_Res});
                if(getOpenPositions_Res.result && getOpenPositions_Res.result.list && getOpenPositions_Res.result.list.length>0){
                    const positionInExchange = getOpenPositions_Res.result.list[0]; // expecting the position to be one as
                    console.log({positionInExchange});
                    logger.info("Saving thee position to DB");
                    // successfully placedd a position
                    const timestampNow = Date.now();
                    
                    await mongoDatabase.collection.tradedPositionsCollection.createNewDocument({
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
                        entry_timestamp: new Date(positionInExchange.createdTime).getTime(),
                        document_created_at_timestamp: timestampNow,
                        direction: position.direction,
                        close_timestamp: timestampNow,
                        allocation_percentage: trade_allocation_percentage,
                    });
                    logger.info("Saved the position to DB");
                }else {
                    throw new Error(openPositionRes.retMsg);
                }
            }else {
                throw new Error(openPositionRes.retMsg);
            }

        }catch(error){
            console.log({error});
            logger.error(JSON.stringify(error.message));
        }
    });

};