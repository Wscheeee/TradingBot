/**
 * 
 * @param {{
*      bybit: import("../../Trader").Bybit,
*      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
*      logger: import("../../Logger").Logger,
*      positionsStateDetector: import("../../MongoDatabase").PositionsStateDetector
* }} param0 
*/
module.exports.positionCloseHandler = async function positionCloseHandler({
    bybit,logger,mongoDatabase,positionsStateDetector
}){
    console.log("fn:positionCloseHandler");
    positionsStateDetector.onPositionClose(async (position, trader) => {
        logger.info("Position closed On DB");
        try{
            // get the open position quantity and close
            logger.info("Getting a list of open positions from bybit_RestClientV5");
            const openPositionsRes = await bybit.clients.bybit_RestClientV5.getOpenPositions({
                category:"linear",
                symbol:position.pair
            });
            logger.info("Get a list of open positions from bybit_RestClientV5");
            console.log({openPositionsRes});
            //@todo: handle errors
            if(openPositionsRes.result && openPositionsRes.result.list && openPositionsRes.result.list.length>0){
                for(const positionInExchange of openPositionsRes.result.list){
                    console.log({positionInExchange});
                    if(positionInExchange.side==="Buy"||positionInExchange.side==="Sell"){
                        // Make surre that the position is actually an active position
                        const closePositionRes = await bybit.clients.bybit_RestClientV5.closeAPosition({
                            category:"linear",
                            orderType:"Market",
                            qty:positionInExchange.size,//String(position.size),
                            side: position.direction==="LONG"?"Sell":"Buy",
                            symbol: position.pair
                        });
                        console.log({closePositionRes});
                        logger.info("Posion closed on bybit_RestClientV5");
                        // if close is successful // update the traded position db
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
                                    close_price: bybit.clients.bybit_LinearClient.getPositionClosePrice(positionInExchange,"Linear"),
                                    closedPNL: bybit.clients.bybit_LinearClient.calculatePositionPNL(positionInExchange),
                                    closedROI: bybit.clients.bybit_LinearClient.calculatePositionROI(positionInExchange),
                                    entry_price: bybit.clients.bybit_LinearClient.getPositionEntryPrice(positionInExchange),
                                    leverage: bybit.clients.bybit_LinearClient.getPositionLeverage(positionInExchange),
                                    // pair: position.pair,
                                    position_id_in_oldTradesCollection: position._id,
                                    // position_id_in_openTradesCollection: position._id,
                                    // server_timezone: process.env.TZ,
                                    size: bybit.clients.bybit_LinearClient.getPositionSize(positionInExchange),
                                    status: "CLOSED",
                                    // trader_uid: trader.uid,
                                    // trader_username: trader.username
                                });
                            logger.info("Closed position in tradedPositionCollection db");
                        }
                    }else {
                        // None Side.
                        logger.info("The position has a side===None");
                    }

                }

            }else {
                if(!openPositionsRes.result){
                    throw new Error(openPositionsRes.retMsg);
                }
                logger.info("The list of open positions from bybit_RestClientV5 is empty");
            }

        }catch(error){
            console.log({error});
            logger.error(JSON.stringify(error.messagee));
        }

    });

    

};