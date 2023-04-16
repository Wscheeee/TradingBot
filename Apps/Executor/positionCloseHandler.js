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
module.exports.positionCloseHandler = async function positionCloseHandler({
    bybit,logger,mongoDatabase,positionsStateDetector
}){
    console.log("fn:positionCloseHandler");
    positionsStateDetector.onPositionClose(async (position, trader) => {
        logger.info("Position closed On DB");
        try{
            // calculate he position sizee to close
            const {standardized_qty,trade_allocation_percentage} = await percentageBased_StaticPositionSizingAlgo({
                bybit,position,trader,percentage_of_total_available_balance_to_use_for_position:1
            });
            // const {standardized_qty,trade_allocation_percentage} = await percentageBased_DynamicPositionSizingAlgo({
            //     bybit,position,trader
            // });

            /**
             * Get the open tradersPositions in DB
             */
            const tradedPositionObj = await mongoDatabase.collection.tradedPositionsCollection.findOne({
                status:"OPEN",
                pair: position.pair,
                direction: position.direction,
                leverage: position.leverage,
                trader_uid: trader.uid
            });
            if(!tradedPositionObj){
                throw new Error("Position setting out to close was never trades/open");
            }


            // get the open active orders
            const getOpenActiveOrders_Res = await bybit.clients.bybit_RestClientV5.getActiveOrders({
                category:"linear",
                symbol: position.pair,
                orderId: tradedPositionObj.order_id,
            });

            if(!getOpenActiveOrders_Res ||!getOpenActiveOrders_Res.result ||Object.keys(getOpenActiveOrders_Res.result).length==0){
                throw new Error(getOpenActiveOrders_Res.retMsg);
            }
            logger.info("Got a list of actiive orders from bybit_RestClientV5");
            const activeOrderInExchange = getOpenActiveOrders_Res.result.list.find((accountOrderV5)=>accountOrderV5.orderId===tradedPositionObj.order_id);
            console.log({activeOrderInExchange});
            if(!activeOrderInExchange)throw new Error("Active order for opened order orderId: "+tradedPositionObj.order_id+" not found in active orders");
            
            const activeOrderToClose = activeOrderInExchange;

            // set user leverage
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
            const closePositionRes = await bybit.clients.bybit_RestClientV5.closeAPosition({
                category:"linear",
                orderType:"Market",
                qty:parseFloat(activeOrderToClose.qty),//String(position.size),// close whole position
                side: position.direction==="LONG"?"Sell":"Buy",
                symbol: position.pair,
            });
            console.log({closePositionRes});
            logger.info("Posion closed on bybit_RestClientV5");

            // get the closed position pnl obj
            logger.info("Get closed partial position info");
            
            const closedPartialPNL_res = await bybit.clients.bybit_RestClientV5.getClosedPositionPNL({
                category:"linear",
                symbol:position.pair,
            });

            
            if(!closedPartialPNL_res.result ||closedPartialPNL_res.result.list[0]){
                logger.error("Position partial expected to be closed , it's close PNL not found.");
            }
            const closedPositionPNLObj = closedPartialPNL_res.result.list.find((closedPnlV5) => closedPnlV5.orderId===closePositionRes.result.orderId );
            // const closedPartialPNL  = closedPartialPNL_res.result.list[0].closedPnl;
            if(!closedPositionPNLObj) {
                throw new Error("closedPositionPNLObj not found for closed partial position:");
            }
            let closedPartialPNL  = parseFloat(closedPositionPNLObj.closedPnl);

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
                        close_price: parseFloat(closedPositionPNLObj.avgExitPrice),
                        closed_pnl: closedPartialPNL,
                        closed_roi_percentage: bybit.calculateClosedPositionROI_fromclosedPnLV5(closedPositionPNLObj),
                        //entry_price: bybit.getPositionEntryPrice(positionInExchange),
                        leverage: parseFloat(closedPositionPNLObj.leverage),//bybit.getPositionLeverage(positionInExchange),
                        // pair: position.pair,
                        position_id_in_oldTradesCollection: position._id,
                        // position_id_in_openTradesCollection: position._id,
                        // server_timezone: process.env.TZ,
                        size: parseFloat(closedPositionPNLObj.qty),
                        status: "CLOSED",
                        close_datetime: new Date(closedPositionPNLObj.updatedTime),
                        document_last_edited_at_datetime: new Date(),
                        
                        // trader_uid: trader.uid,
                        // trader_username: trader.username
                    });
                logger.info("Closed position in tradedPositionCollection db");
            }



        }catch(error){
            console.log({error});
            let errorMsg = "(fn:positionCloseHandler) "+(error && error.message?error.message:"");
            errorMsg+=" ("+position.pair+")";
            logger.error(JSON.stringify(errorMsg));
        }

    });

    

};