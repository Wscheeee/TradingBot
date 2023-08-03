//@ts-check
"use-strict";
const { sendTradeFullCloseEecutedMessage_toUser, sendTradeExecutionFailedMessage_toUser } = require("../../Telegram/message_templates/trade_execution");

const { calculateRoiFromPosition } = require("../ScrapeFollowedTradersPositions/calculateRoiFromPosition");
/**
 *  
 * @param {{
 *      bybit: import("../../Trader/Bybit").Bybit,
 *      onError: (error:Error)=>any,
 *      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
 *      user: import("../../MongoDatabase/collections/users/types").Users_Collection_Document_Interface,
 *      trader?: null|import("../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface,
 *      tg_bot: import("../../Telegram").Telegram
*}} param0 
*/
// *      trader: import("../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface,
module.exports.closeAllPositionsInASubAccount = async function closeAllPositionsInASubAccount({
    bybit,onError, mongoDatabase,user,trader,tg_bot
}){
    const FUNCTION_NAME = "(fn:closeAllPositionsInASubAccount)";
    console.log(FUNCTION_NAME);
    try{  
        // Get open orders
        const ordersResponse = await bybit.clients.bybit_RestClientV5.getPositionInfo_Realtime({category:"linear",settleCoin:"USDT"});
        const orders = ordersResponse.result.list;
        for(const order of orders){
            const {side,size:size_string,symbol, leverage:leverage_string, avgPrice:avgPrice_string} = order;
            const size = parseFloat(size_string);
            const leverage = parseFloat(leverage_string);
            const position_direction = side==="Buy"?"LONG":"SHORT";
            const entry_price = parseFloat(avgPrice_string);
            // await positionCloseHandler_HANDLER({
            //     logger,mongoDatabase, 
            //     trader,
            //     user,
            //     position,
            //     onErrorCb
            // });         
            // close 
            /**
             * Standardize the size
             */
            const sizesToExecute = await bybit.standardizeQuantity({
                quantity:size,
                symbol, 
            });
            const sizeToExecute = sizesToExecute[0];
            console.log({sizesToExecute,sizeToExecute});

            
            if(sizeToExecute===0||!sizeToExecute)throw new Error("sizeToExecute==="+sizeToExecute);
            const total_standardized_qty = sizesToExecute.reduce((a,b)=>a+b,0);
            console.log({total_standardized_qty});

            const symbolInfo = await bybit.clients.bybit_LinearClient.getSymbolInfo(symbol);
            if(!symbolInfo)throw new Error("symbolInfo is undefined");
            const symbolMaxLotSize = symbolInfo.lot_size_filter.max_trading_qty;
            const symbolLotStepSize = symbolInfo.lot_size_filter.qty_step;

            /**
             * Switch position mode
             * */
            const switchPositionMode_Res = await bybit.clients.bybit_LinearClient.switchPositionMode({
                mode:"BothSide",// 3:Both Sides
                symbol
            });
            if(Number(switchPositionMode_Res.ext_code)!==0){
                // an error
                onError(new Error("switchPositionMode_Res: "+""+switchPositionMode_Res.ret_msg));
            }
    
            // Switch user margin
            const setPositionLeverage_Resp = await bybit.clients.bybit_LinearClient.switchMargin({
                is_isolated: true,
                buy_leverage: 1,
                sell_leverage: 1,
                symbol
            });
            if(setPositionLeverage_Resp.ret_code!==0){
                // an error
                onError(new Error("setPositionLeverage_Resp: "+setPositionLeverage_Resp.ret_msg));
            }
            // Set user leverage
            const setUserLeverage_Res = await bybit.clients.bybit_LinearClient.setUserLeverage({
                buy_leverage: leverage,
                sell_leverage: leverage,
                symbol
            });
            if(setUserLeverage_Res.ret_code!==0){
                // an error
                onError(new Error("setUserLeverage_Res: "+""+setUserLeverage_Res.ret_msg+"("+symbol+")"));
            }

            // /**
            //  * Get the position
            //  */
           
            // const theTradeInBybit = await bybit.helpers.getActualOpenPositionInBybit({
            //     bybit,
            //     category:"linear",
            //     side,
            //     symbol
            // });

            /**
             * Close the order
             */ 
    
            const {closePositionsRes} = await bybit.clients.bybit_RestClientV5.closeAPosition({
                orderParams:{
                    category:"linear",
                    orderType:"Market",
                    qty:String(total_standardized_qty),//String(position.size),// close whole position
                    side: side==="Buy"?"Sell":"Buy",
                    symbol, 
                    positionIdx: side==="Buy"?1:2,
                },
                symbolLotStepSize, 
                symbolMaxLotSize
            });
            console.log({closePositionsRes});
            let someCloseIsSucccessful = false;
            const closedPositionAccumulatedDetails = {
                closedPNL:0,
                avgExitPrice: 0,
                leverage: 0,
                qty: 0,
                close_datetime:new Date(),
                averageEntryPrice: 0,
                positionCurrentValue: 0
            };
            // Loop through closePositionsRes 
            for (const closePositionResObj of closePositionsRes){
                const closePositionRes = closePositionResObj.response;
                if(closePositionRes.retCode!==0){
                // throw new Error(closePositionRes.retMsg);
                //instead send error message 
                    await sendTradeExecutionFailedMessage_toUser({
                        bot:tg_bot,
                        chatId: user.chatId,
                        position_direction: position_direction,
                        position_entry_price: entry_price,
                        position_leverage: leverage,
                        position_pair: symbol,
                        trader_username: trader? trader.username:"",
                        reason: "closePositionRes: "+closePositionRes.retMsg
                    });
                    onError(new Error("closePositionRes:"+closePositionRes.retMsg));
                }else {
                    someCloseIsSucccessful = true;
                    console.log("Position closed on bybit_RestClientV5");
                    console.log("Get closed position info");
                    ////////////////////////////////////////////////
                    /// Added for a little delay
        
                    // const getClosedPostionOrderHistory_Res = await bybit.clients.bybit_RestClientV5.getOrderHistory({
                    //     category:"linear",
                    //     symbol,
                    //     orderId: closePositionRes.result.orderId
                    // });
                    // if(getClosedPostionOrderHistory_Res.retCode!==0)throw new Error("getClosedPostionOrderHistory_Res: "+getClosedPostionOrderHistory_Res.retMsg);
                    // console.log("getClosedPostionOrderHistory_Res");
                    // console.log(getClosedPostionOrderHistory_Res.result);
        
                    // const getClosedPositionInfo_res = await bybit.clients.bybit_RestClientV5.getClosedPositionInfo({
                    //     category:"linear",
                    //     orderId:closePositionRes.result.orderId
                
                    // });
                    // console.log({
                    //     getClosedPositionInfo_res: getClosedPositionInfo_res.result.list
                    // }); 
        
                    ///////////////////////////////////////////////////
        
                
                    const closedPositionPNLObj = await bybit.helpers.getClosedPositionPNLObject({
                        bybit,
                        category:"linear",
                        symbol,
                        closedPositionOrderId: closePositionRes.result.orderId
                    });
            
                    let closedPartialPNL  = parseFloat(closedPositionPNLObj.closedPnl);
                    closedPositionAccumulatedDetails.closedPNL+=closedPartialPNL;
                    closedPositionAccumulatedDetails.avgExitPrice =  parseFloat(closedPositionPNLObj.avgExitPrice);
                    closedPositionAccumulatedDetails.leverage =  parseFloat(closedPositionPNLObj.leverage);
                    closedPositionAccumulatedDetails.qty +=  parseFloat(closedPositionPNLObj.qty);
                    closedPositionAccumulatedDetails.close_datetime =  new Date(parseFloat(closedPositionPNLObj.updatedTime));
                    closedPositionAccumulatedDetails.averageEntryPrice =  parseFloat(closedPositionPNLObj.avgEntryPrice);
                    closedPositionAccumulatedDetails.positionCurrentValue +=  parseFloat(closedPositionPNLObj.cumExitValue);
                }

            }
 
            console.log({someCloseIsSucccessful});
            if(!someCloseIsSucccessful){
                onError(new Error("None of the close position was successfull"));
                return;
            }

            console.log({closedPositionAccumulatedDetails});
    
            // if close is successful // update the traded position db
            const tradedOpenPositionDocument = await mongoDatabase.
                collection.
                tradedPositionsCollection.
                findOne({ 
                    direction:position_direction,
                    pair: symbol,
                    size: size,
                    // trader_uid: trader.uid,
                    tg_user_id: user.tg_user_id,
                    testnet: user.testnet
                });
            console.log("Return from mongoDatabase.collection.tradedPositionsCollection.getOneOpenPositionBy");
            if(!tradedOpenPositionDocument){
                console.log("Position open in Bybit is not found in DB");
                onError(new Error("Position open in Bybit is not found in DB"));
            }else { 
                console.log("Position in Bybit found in DB");
                await mongoDatabase.collection.tradedPositionsCollection.
                    updateDocument(tradedOpenPositionDocument._id,{
                        close_price: closedPositionAccumulatedDetails.avgExitPrice,
                        closed_pnl: closedPositionAccumulatedDetails.closedPNL,
                        closed_roi_percentage: bybit.calculateClosedPositionROI({
                            averageEntryPrice: closedPositionAccumulatedDetails.averageEntryPrice,
                            positionCurrentValue:  closedPositionAccumulatedDetails.positionCurrentValue,
                            positionSize: closedPositionAccumulatedDetails.qty
                        }),
                        leverage: closedPositionAccumulatedDetails.leverage,
                        position_id_in_oldTradesCollection: undefined, // Because ttrade not closed by trader
                        size: closedPositionAccumulatedDetails.qty,
                        status: "CLOSED",
                        close_datetime: closedPositionAccumulatedDetails.close_datetime,
                        document_last_edited_at_datetime: new Date(),
                    });
                console.log("Closed position in tradedPositionCollection db");
            }

            // Send message to user
            await sendTradeFullCloseEecutedMessage_toUser({
                bot:tg_bot, 
                position_direction: position_direction,
                position_exit_price: closedPositionAccumulatedDetails.avgExitPrice,
                position_leverage: leverage,
                position_pair: symbol,
                chatId: user.tg_user_id,
                trader_username:  trader?trader.username:"",
                position_roi: calculateRoiFromPosition({
                    close_price: closedPositionAccumulatedDetails.avgExitPrice,
                    direction: position_direction,
                    entry_price:closedPositionAccumulatedDetails.averageEntryPrice,
                    leverage: leverage
                }),
                position_pnl: closedPositionAccumulatedDetails.closedPNL,
                // reason:"Trader Updated in Sub Config"
            });

        }
        
    }catch(error){
        const newErrorMessage = `(fn:closeAnAccountAllOpenPositions) ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};



