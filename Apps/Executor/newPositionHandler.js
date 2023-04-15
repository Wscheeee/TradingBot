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
            // check if there is an already existing position with same pair and direction
            let positionWithSameDirectionIsPresent = false;
            let positionWithDifferentDirectionIsPresent = false;
            const openPositionsListRes = await bybit.clients.bybit_RestClientV5.getOpenPositions({
                category:"linear",
                symbol: position.pair
            });
            if(Object.keys(openPositionsListRes.result).length>0){
                for(const positionInBybit of openPositionsListRes.result.list){
                    if(positionInBybit.side==="Buy" && position.direction==="LONG"){
                        // same direction
                        positionWithSameDirectionIsPresent = true;
                    }else if(positionInBybit.side==="Sell" && position.direction==="SHORT"){
                        positionWithSameDirectionIsPresent = true;
                    }else if(positionInBybit.side==="Buy" && position.direction==="SHORT"){
                        positionWithDifferentDirectionIsPresent = true;
                    }else if(positionInBybit.side==="Sell" && position.direction==="LONG"){
                        positionWithDifferentDirectionIsPresent = true;
                    }else {
                        console.log("");
                    }
                }
            }

            const positionWithSamePairExists = positionWithSameDirectionIsPresent || positionWithDifferentDirectionIsPresent;
            if(positionWithSamePairExists){
                logger.warn("positionWithSamePairExists: "+position.pair);
                return;
            }


            logger.info("Calculate percentageBased_DynamicPositionSizingAlgo");
            const {standardized_qty,trade_allocation_percentage} = await percentageBased_DynamicPositionSizingAlgo({
                bybit,position,trader
            });
            // set user leverage
            const setPositionLeverage_Resp = await bybit.clients.bybit_LinearClient.setPositionLeverage({
                is_isolated: true,
                buy_leverage: position.leverage,
                sell_leverage: position.leverage,
                symbol: position.pair,
            });
            if(setPositionLeverage_Resp.ret_code!==0){
                // an error
                logger.error("setPositionLeverage_Resp: "+setPositionLeverage_Resp.ret_msg);
            }
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
                    const datetimeNow = new Date(timestampNow);
                    
                    await mongoDatabase.collection.tradedPositionsCollection.createNewDocument({
                        close_price: bybit.getPositionClosePrice(positionInExchange,"Linear"),
                        closed_pnl: bybit.calculatePositionPNL(positionInExchange),
                        closed_roi_percentage: bybit.calculatePositionROI(positionInExchange),
                        entry_price: bybit.getPositionEntryPrice(positionInExchange),
                        leverage: bybit.getPositionLeverage(positionInExchange),
                        pair: position.pair,
                        position_id_in_oldTradesCollection: null,
                        position_id_in_openTradesCollection: position._id,
                        size: bybit.getPositionSize(positionInExchange),
                        status: "OPEN",
                        trader_uid: trader.uid,
                        trader_username: trader.username,
                        entry_datetime: new Date(positionInExchange.createdTime),
                        document_created_at_datetime: datetimeNow,
                        document_last_edited_at_datetime: datetimeNow,
                        direction: position.direction,
                        close_datetime: datetimeNow,
                        allocation_percentage: trade_allocation_percentage,
                        server_timezone: process.env.TZ,
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
            let errorMsg = error && error.message?error.message:"";
            errorMsg+=" ("+position.pair+")";
            logger.error(JSON.stringify(errorMsg));
        }
    });

};