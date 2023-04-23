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
module.exports.positionCloseHandler = async function positionCloseHandler({
    bybit,logger,mongoDatabase,positionsStateDetector
}){
    console.log("fn:positionCloseHandler");
    positionsStateDetector.onPositionClose(async (position, trader) => {
        logger.info("Position closed On DB");
        try{

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

            /**
             * Get the qty of the partial to close
            **/
            const userId = 0;
            const {newLeverage,sizeToExecute} = await newPositionSizingAlgorithm({
                bybit,
                position,
                trader,
                mongoDatabase,
                action:"trade_close",
                userId:userId
            });
            const standardized_qty = sizeToExecute;

            /**
             * Switch position mode
             * */
            const switchPositionMode_Res = await bybit.clients.bybit_LinearClient.switchPositionMode({
                mode:"BothSide",// 3:Both Sides
                symbol:position.pair,
            });
            if(switchPositionMode_Res.ext_code!==0){
                // an error
                logger.error("switchPositionMode_Res: "+""+switchPositionMode_Res.ret_msg);
            }

            // Switch user margin
            const setPositionLeverage_Resp = await bybit.clients.bybit_LinearClient.switchMargin({
                is_isolated: true,
                buy_leverage: 1,
                sell_leverage: 1,
                symbol: position.pair
            });
            if(setPositionLeverage_Resp.ret_code!==0){
                // an error
                logger.error("setPositionLeverage_Resp: "+setPositionLeverage_Resp.ret_msg);
            }
            // Set user leverage
            const setUserLeverage_Res = await bybit.clients.bybit_LinearClient.setUserLeverage({
                buy_leverage: newLeverage,// position.leverage,
                sell_leverage:newLeverage,// position.leverage,
                symbol: position.pair
            });
            if(setUserLeverage_Res.ret_code!==0){
                // an error
                logger.error("setUserLeverage_Res: "+""+setUserLeverage_Res.ret_msg+"("+position.pair+")");
            }

            /**
             * Get the order
             */
            const getOrderHistory_Res = await bybit.clients.bybit_RestClientV5.getOrderHistory({
                category:"linear",
                orderId:tradedPositionObj.order_id
            });
            if(Object.keys(getOrderHistory_Res.result).length===0)throw new Error(getOrderHistory_Res.retMsg);
            const orderObject = getOrderHistory_Res.result.list.find((accountOrderV5_)=> accountOrderV5_.orderId===tradedPositionObj.order_id);
            if(!orderObject)throw new Error("orderObject not found in order history");
            console.log({orderObject});

            /**
             * Close the order
             */

            const closePositionRes = await bybit.clients.bybit_RestClientV5.closeAPosition({
                category:"linear",
                orderType:"Market",
                qty:String(standardized_qty),//String(position.size),// close whole position
                side: position.direction==="LONG"?"Sell":"Buy",
                symbol: position.pair,
                positionIdx: position.direction==="LONG"?1:2,
            });
            console.log({closePositionRes});
            logger.info("Posion closed on bybit_RestClientV5");
    
            // get the closed position pnl obj
            logger.info("Get closed partial position info");
                
            const closedPartialPNL_res = await bybit.clients.bybit_RestClientV5.getClosedPositionPNL({
                category:"linear",
                symbol:position.pair,
            });
    
                
            if(!closedPartialPNL_res.result ||!closedPartialPNL_res.result.list[0]){
                logger.error("Position partial expected to be closed , it's close PNL not found.");
            }
            const closedPositionPNLObj = closedPartialPNL_res.result.list.find((closedPnlV5) => closedPnlV5.orderId===closePositionRes.result.orderId );

            if(!closedPositionPNLObj)throw new Error("closedPositionPNLObj not found for closed partial position:");
            
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
                        leverage: parseFloat(closedPositionPNLObj.leverage),
                        position_id_in_oldTradesCollection: position._id,
                        size: parseFloat(closedPositionPNLObj.qty),
                        status: "CLOSED",
                        close_datetime: new Date(parseFloat(closedPositionPNLObj.updatedTime)),
                        document_last_edited_at_datetime: new Date(),
                    });
                logger.info("Closed position in tradedPositionCollection db");
            }
            // calculateUsedAllocationAndSave
            await calculateUsedAllocationAndSave({
                mongoDatabase,
                tradedPosition: tradedPositionObj,
                trader,
                bybit,
            });

        }catch(error){
            console.log({error});
            let errorMsg = "(fn:positionCloseHandler) "+(error && error.message?error.message:"");
            errorMsg+=" ("+position.pair+")";
            logger.error(JSON.stringify(errorMsg));
        }

    });

    

};