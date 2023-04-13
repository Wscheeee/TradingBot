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
module.exports.positionResizeHandler = async function positionResizeHandler({
    bybit,logger,mongoDatabase,positionsStateDetector
}){
    console.log("fn:positionResizeHandler");
    positionsStateDetector.onPositionResize(async (originalPosition,position,trader)=>{
        logger.info("Position Resize On DB");
        try{
            /**
             * Check that the position is actuall in DB
             * Check that the position is actually open in Bybit
             * Close part of the position
             * Create a new tradedPosition document for the part, with status set to close
             */
            // Check that the position is in db
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
                logger.info("Position not in Db: Ignoring the resiize");
            }else {
                logger.info("Position found in db: Working on it");

                // Check that the position is open in bybit
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

                        // calculate he position sizee to close
                        const {standardized_qty,trade_allocation_percentage} = await percentageBased_DynamicPositionSizingAlgo({
                            bybit,position,trader
                        });

                        const closePositionRes = await bybit.clients.bybit_RestClientV5.closeAPosition({
                            category:"linear",
                            orderType:"Market",
                            qty:String(standardized_qty),
                            side: position.direction==="LONG"?"Sell":"Buy",
                            symbol: position.pair
                        });
                        console.log({closePositionRes});
                        if(!closePositionRes ||!closePositionRes.result ||!closePositionRes.result.orderId){
                            throw new Error(closePositionRes.retMsg);
                        }
                        logger.info("Position partially cclosed on bybit_RestClientV5");
                        logger.info("Get closed partial position info");
                        const closedPartialPositionInfo = await bybit.clients.bybit_RestClientV5.getClosedPositionInfo({
                            category:"linear",
                            orderId: closePositionRes.result.orderId
                        });
                        const closed_positionInExchange =  closedPartialPositionInfo.result.list[0];
                        const closedPartialPNL_res = await bybit.clients.bybit_RestClientV5.getClosedPositionPNL({
                            category:"linear",
                            symbol:position.pair
                        });
                        if(!closedPartialPNL_res.result ||closedPartialPNL_res.result.list[0]){
                            logger.error("Position partial expeccted to be closed , it's close PNL not found.");
                        }
                        
                        const closedPartialPNL  = closedPartialPNL_res.result.list[0].closedPnl;
                        const timestampNow = Date.now();
                        // Add the partial position to DB
                        await mongoDatabase.collection.tradedPositionsCollection.createNewDocument({
                            close_price: parseFloat(closed_positionInExchange.avgExitPrice),
                            closed_pnl: parseFloat(closedPartialPNL),
                            closed_roi_percentage:  bybit.clients.bybit_LinearClient.calculateClosedPositionROI(closed_positionInExchange),
                            entry_price: bybit.clients.bybit_LinearClient.getPositionEntryPrice(positionInExchange),
                            leverage: bybit.clients.bybit_LinearClient.getPositionLeverage(positionInExchange),
                            pair: position.pair,
                            position_id_in_oldTradesCollection: position._id,
                            position_id_in_openTradesCollection: tradedOpenPositionDocument.position_id_in_openTradesCollection,
                            server_timezone: process.env.TZ,
                            size: parseFloat(closed_positionInExchange.qty),//bybit_LinearClient.getPositionSize(positionInExchange),
                            status: "CLOSED",
                            trader_uid: trader.uid,
                            trader_username: trader.username,
                            direction: tradedOpenPositionDocument.direction,
                            entry_timestamp: tradedOpenPositionDocument.entry_timestamp,
                            allocation_percentage: trade_allocation_percentage,
                            close_timestamp: timestampNow,
                            document_created_at_timestamp: tradedOpenPositionDocument.document_created_at_timestamp,
                        });
                        logger.info("Saved the partial closed position to DB");



                        // Update the original traded position in DB
                        await mongoDatabase.collection.tradedPositionsCollection.
                            updateDocument(tradedOpenPositionDocument._id,{
                                close_price: bybit.clients.bybit_LinearClient.getPositionClosePrice(positionInExchange,"Linear"),
                                closed_pnl: bybit.clients.bybit_LinearClient.calculatePositionPNL(positionInExchange),
                                closed_roi_percentage: bybit.clients.bybit_LinearClient.calculatePositionROI(positionInExchange),
                                entry_price: bybit.clients.bybit_LinearClient.getPositionEntryPrice(positionInExchange),
                                leverage: bybit.clients.bybit_LinearClient.getPositionLeverage(positionInExchange),
                                pair: position.pair,
                                position_id_in_oldTradesCollection: null,
                                position_id_in_openTradesCollection: position._id,
                                server_timezone: process.env.TZ,
                                size: parseFloat(closed_positionInExchange.leavesQty),
                                status: "OPEN",
                                trader_uid: trader.uid,
                                trader_username: trader.username,
                                allocation_percentage: tradedOpenPositionDocument.allocation_percentage - trade_allocation_percentage,
                            });
                        logger.info("Updated position in tradedPositionCollection db");

                    }
                }else {
                    logger.info("No position matching the resize found in bybit_RestClientV5 positions");
                }

            }

        }catch(error){
            console.log({error});
            logger.error(JSON.stringify(error.message));
        }
    });

};