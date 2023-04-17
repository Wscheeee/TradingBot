const {percentageBased_DynamicPositionSizingAlgo,percentageBased_StaticPositionSizingAlgo} = require("./algos/qty");

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
            /**
             * Check that the position is in db
             * */
            const tradedOpenPositionDocument = await mongoDatabase.
                collection.
                tradedPositionsCollection.
                getOneOpenPositionBy({
                    direction:position.direction,
                    pair: position.pair,
                    trader_uid: trader.uid
                });
            logger.info("Return from mongoDatabase.collection.tradedPositionsCollection.getOneOpenPositionBy");
                    
            if(!tradedOpenPositionDocument) throw new Error("Position to update not in DB meaning itt was not traded");
            logger.info("Position found in db: Working on it");


            // get the open position 
            logger.info("Getting a list of positions from bybit_RestClientV5");
            const openPositionsRes = await bybit.clients.bybit_RestClientV5.getOpenPositions({
                category:"linear",
                symbol:position.pair
            });
            logger.info("Got a list of positions from bybit_RestClientV5");
            console.log({openPositionsRes});
            if(!openPositionsRes ||!openPositionsRes.result || Object.keys(openPositionsRes.result).length===0)throw new Error(openPositionsRes.retMsg);

            const positionInExchange = openPositionsRes.result.list.find((positionV5_)=> 
                positionV5_.symbol===position.pair && positionV5_.side===(position.direction==="LONG"?"Buy":"Sell") 
                && parseFloat(positionV5_.leverage)===position.leverage
            );
            console.log({positionInExchange});
            if(!positionInExchange)throw new Error("fn(update position) The position of order id: "+tradedOpenPositionDocument.order_id+" not ffound in bybit exchange");
            logger.info("Position found in exchange");
            /**
             * Calculate the updated qty
             */
            logger.info("Calculate percentageBased_DynamicPositionSizingAlgo");
            const {standardized_qty,trade_allocation_percentage} = await percentageBased_StaticPositionSizingAlgo({
                bybit,position,trader,percentage_of_total_available_balance_to_use_for_position:1
            });
            // const {standardized_qty,trade_allocation_percentage} = await percentageBased_DynamicPositionSizingAlgo({
            //     bybit,position,trader
            // });
            if(standardized_qty==parseFloat(tradedOpenPositionDocument.size)) throw new Error("Not updating the position as qty not changed");
            logger.info("qy changed so uupdating the order");
            const setPositionLeverage_Resp = await bybit.clients.bybit_LinearClient.setPositionLeverage({
                is_isolated: true,
                buy_leverage: position.leverage,
                sell_leverage: position.leverage,
                symbol: position.pair
            });
            if(setPositionLeverage_Resp.ret_code!==0){
                // an error
                logger.error("setPositionLeverage_Resp: "+setPositionLeverage_Resp.ret_msg);
            }

            logger.info("Sending an order to update the position at bybit_RestClientV5");
            const updatePositionRes = await bybit.clients.bybit_RestClientV5.updateAPosition({
                category:"linear",
                
                // orderId: tradedOpenPositionDocument.order_id,
                symbol: position.pair,
                qty: String(standardized_qty),

            });
            if(!updatePositionRes ||!updatePositionRes.result|| !updatePositionRes.result.orderId){
                throw new Error(updatePositionRes.retMsg);
            }
            logger.info("Updated the position at bybit_RestClientV5");
            console.log({updatePositionRes});

            // get the new active order
            logger.info("Getting a list of open active orders from bybit_RestClientV5");
            const getActiveOrders_Res = await bybit.clients.bybit_RestClientV5.getActiveOrders({
                category:"linear",
                symbol: position.pair,
                orderId: updatePositionRes.result.orderId,
            });
            if(!getActiveOrders_Res ||!getActiveOrders_Res.result ||Object.keys(getActiveOrders_Res.result).length==0){
                throw new Error(getActiveOrders_Res.retMsg);
            }
            logger.info("Got a list of actiive orders from bybit_RestClientV5");
            const orderInExchange = getActiveOrders_Res.result.list.find((accountOrderV5)=>accountOrderV5.orderId===updatePositionRes.result.orderId);
            console.log({orderInExchange});
            if(!orderInExchange)throw new Error("Active order for updated order orderId: "+updatePositionRes.result.orderId+" not found in active orders");
            
            // update the TradedTrades db document
            await mongoDatabase.collection.tradedPositionsCollection.
                updateDocument(tradedOpenPositionDocument._id,{
                    close_price: bybit.getPositionClosePrice(positionInExchange,"Linear"),
                    closed_pnl: bybit.calculatePositionPNL(positionInExchange),
                    closed_roi_percentage: bybit.calculatePositionROI(positionInExchange),
                    entry_price: tradedOpenPositionDocument.entry_price,
                    leverage: parseFloat(tradedOpenPositionDocument.leverage),
                    pair: position.pair,
                    position_id_in_oldTradesCollection: null,
                    position_id_in_openTradesCollection: position._id,
                    server_timezone: process.env.TZ,
                    size: parseFloat(orderInExchange.qty),
                    status: "OPEN",
                    trader_uid: trader.uid,
                    trader_username: trader.username,
                    allocation_percentage: trade_allocation_percentage,
                    document_last_edited_at_datetime: new Date(),
                    order_id: updatePositionRes.result.orderId
                });
            logger.info("Updated position in tradedPositionCollection db");


        }catch(error){
            console.log({error});
            let errorMsg = "(fn:positionUpdateHandler) "+ (error && error.message?error.message:"");
            errorMsg+=" ("+position.pair+")";
            logger.error(JSON.stringify(errorMsg));
        }
    });

};