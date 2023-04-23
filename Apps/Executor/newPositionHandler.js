const {newPositionSizingAlgorithm} = require("./algos/qty");
const {calculateUsedAllocationAndSave} = require("./calculateUsedAllocationAndSave");

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
            const userId = 0;
            const {newLeverage,sizeToExecute} = await newPositionSizingAlgorithm({
                bybit,
                position,
                trader,
                mongoDatabase,
                action:"new_trade",
                userId:userId
            });
            const standardized_qty = sizeToExecute;
            
            // Switch position mode
            const switchPositionMode_Res = await bybit.clients.bybit_LinearClient.switchPositionMode({
                mode:"BothSide",// 3:Both Sides
                symbol:position.pair,
            });
            if(switchPositionMode_Res.ext_code!==0){
                // an error
                logger.error("switchPositionMode_Res: "+""+switchPositionMode_Res.ret_msg);
            }

            /**
             * Switch Margin
             */
            const setPositionLeverage_Resp = await bybit.clients.bybit_LinearClient.switchMargin({
                is_isolated: true,
                buy_leverage:1,
                sell_leverage:1,
                symbol: position.pair,
            });
            if(setPositionLeverage_Resp.ret_code!==0){
                // an error
                logger.error("setPositionLeverage_Resp: "+""+setPositionLeverage_Resp.ret_msg+"("+position.pair+")");
            }
            /**
             * Seet User Leverage
             */
            const setUserLeverage_Res = await bybit.clients.bybit_LinearClient.setUserLeverage({
                buy_leverage: newLeverage,//position.leverage,
                sell_leverage: newLeverage,//position.leverage,
                symbol: position.pair
            });
            if(setUserLeverage_Res.ret_code!==0){
                // an error
                logger.error("setUserLeverage_Res: "+""+setUserLeverage_Res.ret_msg+"("+position.pair+")");
            }
            logger.info("Sending openANewPosition Order to bybit_RestClientV5");
            const openPositionRes = await bybit.clients.bybit_RestClientV5.openANewPosition({
                category:"linear",
                orderType:"Market",
                qty:String(standardized_qty),//String(symbolInfo.lot_size_filter.min_trading_qty),
                side: position.direction==="LONG"?"Buy":"Sell",
                symbol: position.pair,
                positionIdx:position.direction==="LONG"?1:2, //Used to identify positions in different position modes. Under hedge-mode, this param is required 0: one-way mode  1: hedge-mode Buy side 2: hedge-mode Sell side
            });
            if(!openPositionRes || !openPositionRes.result || Object.keys(openPositionRes.result).length==0){
                throw new Error(openPositionRes.retMsg);
            }
            logger.info("Got response from openANewPosition Order from bybit_RestClientV5");
            console.log({openPositionRes});
            logger.info("The openANewPosition response has a orderId Meaning order was successfull");
            logger.info("Getting a list of open active orders from bybit_RestClientV5");
            const getActiveOrders_Res = await bybit.clients.bybit_RestClientV5.getActiveOrders({
                category:"linear",
                symbol: position.pair,
                orderId: openPositionRes.result.orderId,
            });
            if(!getActiveOrders_Res ||!getActiveOrders_Res.result ||Object.keys(getActiveOrders_Res.result).length==0){
                throw new Error(getActiveOrders_Res.retMsg);
            }
            logger.info("Got a list of active orders from bybit_RestClientV5");
            const orderInExchange = getActiveOrders_Res.result.list.find((accountOrderV5)=>accountOrderV5.orderId===openPositionRes.result.orderId);
            console.log({orderInExchange});
            if(!orderInExchange)throw new Error("Active order for opened order orderId: "+openPositionRes.result.orderId+" not found in active orders");
            logger.info("Saving the position to DB");
            // successfully placed a position

            // Find the trade related to the user
            const userTrade_Cursor = await mongoDatabase.collection["tradedPositionsCollection"].findOne({
                status: "OPEN",
                pair: position.pair,
                direction: position.direction,
                trader_uid: position.trader_uid,
                user_id: userId
            });
            if(!userTrade_Cursor) throw new Error("userTrade_Cursor not found");
            
            await mongoDatabase.collection.tradedPositionsCollection.updateDocument(userTrade_Cursor._id,{
                entry_price: bybit.getPositionEntryPrice(orderInExchange),
                leverage: position.leverage,
                pair: position.pair,
                position_id_in_openTradesCollection: position._id,
                size: parseFloat(orderInExchange.qty),
                status: "OPEN",
                trader_uid: trader.uid,
                trader_username: trader.username,
                entry_datetime: new Date(parseFloat(orderInExchange.createdTime)),
                direction: position.direction,
                traded_value: (orderInExchange.cumExecValue / position.leverage),
                order_id: openPositionRes.result.orderId,
            });
            logger.info("Saved the position to DB");


            // calculateUsedAllocationAndSave
            await calculateUsedAllocationAndSave({
                mongoDatabase,
                tradedPosition: await mongoDatabase.collection.tradedPositionsCollection.getDocumentById(userTrade_Cursor._id),
                trader,
                bybit,
            });
            
        }catch(error){
            console.log({error});
            let errorMsg = "(fn:newPositionHandler) "+ (error && error.message?error.message:"");
            errorMsg+=" ("+position.pair+")";
            logger.error(JSON.stringify(errorMsg));
        }
    });

};