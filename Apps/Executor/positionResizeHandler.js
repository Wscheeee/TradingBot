const {newPositionSizingAlgorithm} = require("./algos/qty");
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
            const tradedPositionObj = await mongoDatabase.
                collection.
                tradedPositionsCollection.
                getOneOpenPositionBy({
                    direction:position.direction,
                    pair: position.pair,
                    trader_uid: trader.uid
                });
            logger.info("Return from mongoDatabase.collection.tradedPositionsCollection.getOneOpenPositionBy");
                    
            if(!tradedPositionObj)throw new Error("Position to resize not in DB meaning it was not traded");
                
            logger.info("Position found in db: Working on it");

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
             * Get the qty of the partial to close
             */
            const userId = 0;
            const {newLeverage,sizeToExecute} = await newPositionSizingAlgorithm({
                bybit,
                position,
                trader,
                mongoDatabase,
                action:"resize",
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

            /**
             * Set position leverage
             */
            // Switch margin
            const setPositionLeverage_Resp = await bybit.clients.bybit_LinearClient.switchMargin({
                is_isolated: true,
                buy_leverage: 1,
                sell_leverage: 1,
                symbol: position.pair
            });
            if(setPositionLeverage_Resp.ret_code!==0){
                // an error
                logger.error("setPositionLeverage_Resp: "+setPositionLeverage_Resp.ret_msg+"("+position.pair+")");
            }
            // Set user leverage
            const setUserLeverage_Res = await bybit.clients.bybit_LinearClient.setUserLeverage({
                buy_leverage: newLeverage,//position.leverage,
                sell_leverage: newLeverage,//position.leverage,
                symbol: position.pair
            });
            if(setUserLeverage_Res.ret_code!==0){
                // an error
                logger.error("setUserLeverage_Res: "+setUserLeverage_Res.ret_msg+"("+position.pair+")");
            }

            /**
             * Close the partial 
             */
            const closePositionRes = await bybit.clients.bybit_RestClientV5.closeAPosition({
                category:"linear",
                orderType:"Market",
                qty:String(standardized_qty),
                side: position.direction==="LONG"?"Sell":"Buy",
                symbol: position.pair,
                positionIdx: position.direction==="LONG"?1:2
            });
            console.log({closePositionRes});
            if(!closePositionRes ||!closePositionRes.result ||!closePositionRes.result.orderId){
                throw new Error(closePositionRes.retMsg);
            }
            logger.info("Position partially cclosed on bybit_RestClientV5");

            /**
             * Get Closed partial Info
             */
            logger.info("Get closed partial position info");
            const closedPartialPositionInfo_Res = await bybit.clients.bybit_RestClientV5.getClosedPositionInfo({
                category:"linear",
                orderId: closePositionRes.result.orderId,
                symbol: position.pair
            });
            if(Object.keys(closedPartialPositionInfo_Res.result).length===0)throw new Error(closedPartialPositionInfo_Res.retMsg);

            const closed_positionInExchange_Obj =  closedPartialPositionInfo_Res.result.list.find((accountOrderV5_)=>
                accountOrderV5_.orderId=== closePositionRes.result.orderId
            );
            if(!closed_positionInExchange_Obj)throw new Error("closed_positionInExchange_Obj not found");
            console.log({closed_positionInExchange_Obj});

            /**
             * Get PNL of the partial close
             */
            const closedPartialPNL_res = await bybit.clients.bybit_RestClientV5.getClosedPositionPNL({
                category:"linear",
                symbol:position.pair,
            });

                
            if(!closedPartialPNL_res.result ||!closedPartialPNL_res.result.list[0]){
                logger.error("Position partial expected to be closed , it's close PNL not found.");
                logger.error(closedPartialPNL_res.retMsg);
            }
            const closedPositionPNLObj = closedPartialPNL_res.result.list.find((closedPnlV5) => closedPnlV5.orderId===closePositionRes.result.orderId );
            if(!closedPositionPNLObj)throw new Error("closedPositionPNLObj not found for closed partial position:");
            
            let closedPartialPNL  = parseFloat(closedPositionPNLObj.closedPnl);

            const timestampNow = Date.now();
            /**
             * Add the partial position to DB
             */
            await mongoDatabase.collection.tradedPositionsCollection.createNewDocument({
                close_price: parseFloat(closedPositionPNLObj.avgExitPrice),
                closed_pnl: closedPartialPNL,
                closed_roi_percentage: bybit.calculateClosedPositionROI_fromclosedPnLV5(closedPositionPNLObj),
                entry_price: closedPositionPNLObj.avgEntry,//Pricebybit.getPositionEntryPrice(positionInExchange),
                leverage: parseFloat(closedPositionPNLObj.leverage),
                pair: position.pair,
                position_id_in_oldTradesCollection: position._id,
                position_id_in_openTradesCollection: orderObject.position_id_in_openTradesCollection,
                size: parseFloat(closedPositionPNLObj.qty),
                order_id: orderObject.order_id,
                actual_position_leverage: orderObject.actual_position_leverage,
                actual_position_original_size: orderObject.actual_position_original_size,
                actual_position_size: orderObject.qty,
                status: "CLOSED",
                trader_uid: trader.uid,
                trader_username: trader.username,
                direction: orderObject.direction,
                entry_datetime: orderObject.entry_datetime,
                // allocation_percentage: trade_allocation_percentage,
                close_datetime: new Date(timestampNow),
                document_created_at_datetime: orderObject.document_created_at_datetime,
                document_last_edited_at_datetime: new Date(),
                server_timezone: process.env.TZ,
                // part: position.part
            });
            logger.info("Saved the partial closed position to DB");

 

            /**
             * Update the original traded position in DB
             */
            await mongoDatabase.collection.tradedPositionsCollection.
                updateDocument(tradedPositionObj._id,{
                    position_id_in_oldTradesCollection: null,
                    position_id_in_openTradesCollection: position._id,
                    server_timezone: process.env.TZ,
                    size: tradedPositionObj.size- parseFloat(closed_positionInExchange_Obj.qty),
                    status: "OPEN",
                    trader_uid: trader.uid,
                    trader_username: trader.username,
                    // allocation_percentage: tradedPositionObj.allocation_percentage - trade_allocation_percentage,
                    document_last_edited_at_datetime: new Date(),
                });
            logger.info("Updated position in tradedPositionCollection db");

        }catch(error){
            console.log({error});
            let errorMsg = "(fn:positionResizeHandler) "+(error && error.message?error.message:"");
            errorMsg+=" ("+position.pair+")";
            logger.error(JSON.stringify(errorMsg));
        }
    });

};