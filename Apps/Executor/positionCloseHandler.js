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
module.exports.positionCloseHandler = async function positionCloseHandler({
    bybit,logger,mongoDatabase,positionsStateDetector
}){
    console.log("fn:positionCloseHandler");
    positionsStateDetector.onPositionClose(async (position, trader) => {
        logger.info("Position closed On DB");
        try{
            // calculate he position sizee to close
            const {standardized_qty,trade_allocation_percentage} = await percentageBased_DynamicPositionSizingAlgo({
                bybit,position,trader
            });

            // get the open position 
            logger.info("Getting a list of open positions from bybit_RestClientV5");
            const openPositionsRes = await bybit.clients.bybit_RestClientV5.getOpenPositions({
                category:"linear",
                symbol:position.pair
            });
            logger.info("Get a list of open positions from bybit_RestClientV5");
            console.log({openPositionsRes});
            if(!openPositionsRes ||!openPositionsRes.result || Object.keys(openPositionsRes.result).length==0){
                throw new Error(openPositionsRes.retMsg);
            }
            // get the position to close;
            const positionToClose = openPositionsRes.result.list.find((positionV5)=> 
                positionV5.side===(position.direction==="LONG"?"Buy":"Sell")  && positionV5.leverage===position.leverage &&
                positionV5.symbol===position.pair && parseFloat(positionV5.size)===standardized_qty
            );

            if(!positionToClose){
                throw new Error("Position to close not found:");
            }

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
                qty:positionToClose.size,//String(position.size),
                side: position.direction==="LONG"?"Sell":"Buy",
                symbol: position.pair
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
            let errorMsg = error && error.message?error.message:"";
            errorMsg+=" ("+position.pair+")";
            logger.error(JSON.stringify(errorMsg));
        }

    });

    

};