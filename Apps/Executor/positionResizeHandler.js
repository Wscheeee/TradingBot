//@ts-check

const { DecimalMath } = require("../../DecimalMath");
const { sendTradePartialCloseExecutedMessage_toUser, sendTradeExecutionFailedMessage_toUser } = require("../../Telegram/message_templates/trade_execution");
const {Bybit} = require("../../Trader");

const {newPositionSizingAlgorithm} = require("./algos/qty");

/**
 * 
 * @param {{
*      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
*      logger: import("../../Logger").Logger,
*      positionsStateDetector: import("../../MongoDatabase").PositionsStateDetector,
*      bot: import("../../Telegram").Telegram,
*      onErrorCb:(error:Error)=>any
* }} param0 
*/
module.exports.positionResizeHandler = async function positionResizeHandler({
    logger,mongoDatabase,positionsStateDetector,bot,onErrorCb
}){
    console.log("fn:positionResizeHandler");
    positionsStateDetector.onPositionResize(async (originalPosition,position,trader)=>{
        logger.info("Position Resize On DB");
        try{ 
            /****
             * Get all users cursor
             * 
             */
            const users_Cursor = await mongoDatabase.collection.usersCollection.getAllDocumentsBy({
                status: true
            });
            const users_array = await users_Cursor.toArray();
            const promises = [];
            for(const user of users_array){
                try{
                    
                    promises.push(handler({
                        // bybit:bybitSubAccount,
                        logger,
                        mongoDatabase,
                        position,
                        trader,
                        user,
                        bot,
                        onErrorCb:(error)=>{
                            const newErrorMessage = `(fn:positionResizeHandler)  trader :${trader.username}) and user :(${user.tg_user_id}) ${error.message}`;
                            error.message = newErrorMessage;
                            onErrorCb(error);
                        }
                    }));
                    
                }catch(error){
                    // Error thrown only for user but loop not to be stopped
                    const newErrorMessage = `(fn:positionResizeHandler) trader :${trader.username}) and user :(${user.tg_user_id}) ${error.message}`;
                    error.message = newErrorMessage;
                    onErrorCb(error);
                }
                
            }

            await Promise.allSettled(promises);


        }catch(error){
            console.log({error});
            let errorMsg = "(fn:positionResizeHandler) "+(error && error.message?error.message:"");
            errorMsg+=" ("+position.pair+")";
            logger.error(JSON.stringify(errorMsg));
        }
    });

};

/**
 * 
 * @param {{
*      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
*      logger: import("../../Logger").Logger,
*      position: import("../../MongoDatabase/collections/open_trades/types").OpenTrades_Collection_Document_Interface,
*      trader: import("../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface,
*      user: import("../../MongoDatabase/collections/users/types").Users_Collection_Document_Interface,
*      bot: import("../../Telegram").Telegram,
*      onErrorCb:(error:Error)=>any
*}} param0 
*/
async function handler({
    logger,mongoDatabase,position,trader,user,bot,onErrorCb
}){

    try {
        if(!user.privateKey.trim() ||!user.publicKey.trim()){
            sendTradeExecutionFailedMessage_toUser({
                bot,
                chatId: user.chatId,
                position_direction: position.direction,
                position_entry_price: position.entry_price,
                position_leverage: position.leverage,
                position_pair: position.pair,
                trader_username: user.atomos?"Anonymous":trader.username,
                reason: "Trade Execution Error: NO API KEYS PRESENT IN USER DOCUMENT"
            });
            throw new Error("Trade Execution Error: NO API KEYS PRESENT IN USER DOCUMENT");
        }
        /////////////////////////////////////////////

        /**
         * Connect to user Bybit Account
         */
        const subAccountDocument = await mongoDatabase.collection.subAccountsCollection.findOne({
            tg_user_id: user.tg_user_id,
            trader_uid: trader.uid,
            testnet: user.testnet 
        });
        if(!subAccountDocument) {
            await sendTradeExecutionFailedMessage_toUser({
                bot,
                chatId: user.chatId,
                position_direction: position.direction,
                position_entry_price: position.entry_price,
                position_leverage: position.leverage,
                position_pair: position.pair,
                trader_username:  user.atomos?"Anonymous":trader.username,
                reason: "Position Resize Execution Error: No SubAccount found for trader"
            });
            throw new Error(`No SubAccount found in subAccountDocument for trader :${trader.username}) and user :(${user.tg_user_id}) `);
        }
        if(!subAccountDocument.private_api.trim() ||!subAccountDocument.public_api.trim()){
            await sendTradeExecutionFailedMessage_toUser({
                bot,
                chatId: user.chatId,
                position_direction: position.direction,
                position_entry_price: position.entry_price,
                position_leverage: position.leverage,
                position_pair: position.pair,
                trader_username:  user.atomos?"Anonymous":trader.username,
                reason: "Posiition RResize Error: NO API KEYS PRESENT IN SUBACCOUNT"
            });
            throw new Error("NO API KEYS PRESENT IN SUBACCOUNT");
        }
        const bybitSubAccount = new Bybit({
            millisecondsToDelayBetweenRequests: 5000,
            privateKey: subAccountDocument.private_api,
            publicKey: subAccountDocument.public_api,
            testnet: subAccountDocument.testnet===false?false:true
        });



        /////////////////////////////////////////////
        const bybit = bybitSubAccount;
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
            findOne({
                direction:position.direction,
                pair: position.pair,
                trader_uid: trader.uid, 
                testnet: user.testnet
            });
        logger.info("Return from mongoDatabase.collection.tradedPositionsCollection.getOneOpenPositionBy");
                        
        if(!tradedPositionObj)throw new Error("Position to resize not in DB meaning it was not traded");
                    
        logger.info("Position found in db: Working on it");
    
        // /**
        //          * Get the order
        //          */
        // const getOrderHistory_Res = await bybit.clients.bybit_RestClientV5.getOrderHistory({
        //     category:"linear",
        //     orderId:tradedPositionObj.order_id
        // });
        // if(Object.keys(getOrderHistory_Res.result).length===0)throw new Error(getOrderHistory_Res.retMsg);
        // const orderObject = getOrderHistory_Res.result.list.find((accountOrderV5_)=> accountOrderV5_.orderId===tradedPositionObj.order_id);
        // if(!orderObject)throw new Error("orderObject not found in order history");
        // console.log({orderObject});
        /**
         * Get the position
         */
        const getOpenPosition_Result =  await bybit.clients.bybit_RestClientV5.getPositionInfo_Realtime({
            category:"linear",
            // settleCoin:"USDT"
            symbol: position.pair,
            
        });

        if(getOpenPosition_Result.retCode!==0)throw new Error(`getOpenPosition_Result: ${getOpenPosition_Result.retMsg}`);
        // console.log({getOpenPosiion_Result});
        const theTradeInBybit = getOpenPosition_Result.result.list.find((p)=>{
            console.log({
                p
            });
            if(
                p.side===(position.direction==="LONG"?"Buy":"Sell")
                &&
                p.symbol===position.pair
            ){
                return p;
            }
        });

        if(!theTradeInBybit)throw new Error(`(getOpenPosition_Result) theTradeInBybit is ${theTradeInBybit}`);
        //    position.previous_size_before_partial_close
    
        /**
         * Get the qty of the partial to close
         */
        const {sizesToExecute, symbolLotStepSize, symbolMaxLotSize} = await newPositionSizingAlgorithm({
            bybit,
            position,
            trader,
            mongoDatabase,
            action:"resize",
            user
        });
        const sizeToExecute = sizesToExecute[0];
        console.log({sizesToExecute,sizeToExecute});
        
        if(sizeToExecute===0||!sizeToExecute)throw new Error("sizeToExecute==="+sizeToExecute);
        const total_standardized_qty = sizesToExecute.reduce((a,b)=>a+b,0);
        console.log({total_standardized_qty});
    
        /**
         * Switch position mode
         * */
        const switchPositionMode_Res = await bybit.clients.bybit_LinearClient.switchPositionMode({
            mode:"BothSide",// 3:Both Sides
            symbol:position.pair,
        });
        if(Number(switchPositionMode_Res.ext_code)!==0){
            // an error
            logger.error("switchPositionMode_Res: "+""+switchPositionMode_Res.ret_msg);
        }
    
  
        // Switch margin
        const setPositionLeverage_Resp = await bybit.clients.bybit_LinearClient.switchMargin({
            is_isolated: false,
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
            buy_leverage: position.leverage,
            sell_leverage: position.leverage,
            symbol: position.pair
        });
        if(setUserLeverage_Res.ret_code!==0){
            // an error
            logger.error("setUserLeverage_Res: "+setUserLeverage_Res.ret_msg+"("+position.pair+")");
        }
    
        /**
                 * Close the partial 
                 */
        const {closePositionsRes} = await bybit.clients.bybit_RestClientV5.closeAPosition({
            orderParams:{
                category:"linear",
                orderType:"Market",
                qty:String(total_standardized_qty),//String(position.size),// close whole position
                side: position.direction==="LONG"?"Sell":"Buy",
                symbol: position.pair,
                positionIdx: position.direction==="LONG"?1:2,
            },
            symbolLotStepSize, 
            symbolMaxLotSize
        });
        console.log({closePositionsRes});
        let someCloseIsSucccessful = false;
        const closedPositionAccumulatedDetails = {
            closedlPNL:0,
            avgExitPrice: 0,
            leverage: 0,
            qty: 0,
            close_datetime:new Date(),
            averageEntryPrice: 0,
            positionCurrentValue: 0,
            tradedValue:0
        };
        // Loop through closePositionsRes 
        for (const closePositionResObj of closePositionsRes){
            const closePositionRes = closePositionResObj.response;
            if(closePositionRes.retCode!==0){
                // throw new Error(closePositionRes.retMsg);
                //instead send error message 
                logger.error("closePositionRes:"+closePositionRes.retMsg);
                sendTradeExecutionFailedMessage_toUser({
                    bot,
                    chatId: user.chatId,
                    position_direction: position.direction,
                    position_entry_price: position.entry_price,
                    position_leverage: position.leverage,
                    position_pair: position.pair,
                    trader_username:  user.atomos?"Anonymous":trader.username,
                    reason: "Position Resize: Close Position Error: "+closePositionRes.retMsg
                });
            }else {
                someCloseIsSucccessful = true;
                logger.info("Position closed on bybit_RestClientV5");
                logger.info("Get closed position info");
                ////////////////////////////////////////////////
                /// Added for a little delay
        
                const getClosedPostionOrderHistory_Res = await bybit.clients.bybit_RestClientV5.getOrderHistory({
                    category:"linear",
                    symbol: position.pair,
                    orderId: closePositionRes.result.orderId
                });
                if(getClosedPostionOrderHistory_Res.retCode!==0)throw new Error(getClosedPostionOrderHistory_Res.retMsg);
                console.log("getClosedPostionOrderHistory_Res");
                console.log(getClosedPostionOrderHistory_Res.result);
        
                const getClosedPositionInfo_res = await bybit.clients.bybit_RestClientV5.getClosedPositionInfo({
                    category:"linear",
                    orderId:closePositionRes.result.orderId
                
                });
                console.log({
                    getClosedPositionInfo_res: getClosedPositionInfo_res.result.list
                });
        
                ///////////////////////////////////////////////////
        
                
                const closedPartialPNL_res = await bybit.clients.bybit_RestClientV5.getClosedPositionPNL({
                    category:"linear",
                    symbol:position.pair,
                });
                // orderId: '07d2a19c-7148-453a-b4d9-fa0f17b5746c'
                console.log({closedPartialPNL_res});
                if(!closedPartialPNL_res.result ||closedPartialPNL_res.result.list.length===0){
                    logger.error("Position partial expected to be closed , it's close PNL not found.");
                }
                console.log({closedPartialPNL_res: closedPartialPNL_res.result});
                const closedPositionPNLObj = closedPartialPNL_res.result.list.find((closedPnlV5) => closedPnlV5.orderId===closePositionRes.result.orderId );
            
                if(!closedPositionPNLObj)throw new Error("closedPositionPNLObj not found for closed partial position:");
            
                let closedPartialPNL  = parseFloat(closedPositionPNLObj.closedPnl);
                closedPositionAccumulatedDetails.closedlPNL+=closedPartialPNL;
                closedPositionAccumulatedDetails.avgExitPrice =  parseFloat(closedPositionPNLObj.avgExitPrice);
                closedPositionAccumulatedDetails.leverage =  parseFloat(closedPositionPNLObj.leverage);
                closedPositionAccumulatedDetails.qty +=  parseFloat(closedPositionPNLObj.qty);
                closedPositionAccumulatedDetails.close_datetime =  new Date(parseFloat(closedPositionPNLObj.updatedTime));
                closedPositionAccumulatedDetails.averageEntryPrice =  parseFloat(closedPositionPNLObj.avgEntryPrice);
                closedPositionAccumulatedDetails.positionCurrentValue +=  parseFloat(closedPositionPNLObj.cumExitValue);
                closedPositionAccumulatedDetails.tradedValue +=  parseFloat(closedPositionPNLObj.cumExitValue);
            }

        }
 
        console.log({someCloseIsSucccessful});
        if(!someCloseIsSucccessful){
            logger.error("None of the close position was successfull");
            return;
        }

        console.log({closedPositionAccumulatedDetails});
    
        const timestampNow = Date.now();
        const dateNow = new Date();
        /**
                 * Add the partial position to DB
                 */
        await mongoDatabase.collection.tradedPositionsCollection.createNewDocument({
            close_price: closedPositionAccumulatedDetails.avgExitPrice,
            testnet: tradedPositionObj.testnet,
            closed_pnl: closedPositionAccumulatedDetails.closedPNL,
            closed_roi_percentage: bybit.calculateClosedPositionROI({
                averageEntryPrice: closedPositionAccumulatedDetails.averageEntryPrice,
                positionCurrentValue:  closedPositionAccumulatedDetails.positionCurrentValue,
                positionSize: closedPositionAccumulatedDetails.qty
            }),
            entry_price: closedPositionAccumulatedDetails.averageEntryPrice,//Pricebybit.getPositionEntryPrice(positionInExchange),
            leverage: closedPositionAccumulatedDetails.leverage,
            pair: position.pair,
            position_id_in_oldTradesCollection: tradedPositionObj.position_id_in_oldTradesCollection,
            position_id_in_openTradesCollection: tradedPositionObj.position_id_in_openTradesCollection,
            size: closedPositionAccumulatedDetails.qty,
            actual_position_size: position.size,
            status: "CLOSED",
            trader_uid: trader.uid,
            trader_username: trader.username?trader.username:"",
            direction: position.direction,
            entry_datetime: tradedPositionObj.entry_datetime,
            close_datetime: new Date(timestampNow),
            tg_user_id: user.tg_user_id,
            actual_position_leverage: position.leverage,
            actual_position_original_size: position.original_size,
            document_created_at_datetime: dateNow,
            document_last_edited_at_datetime: dateNow,
            server_timezone: process.env.TZ??"",
            traded_value: closedPositionAccumulatedDetails.tradedValue
        });
        logger.info("Saved the partial closed position to DB");
    
    
        /**
         * Update the original traded position in DB
         */
        await mongoDatabase.collection.tradedPositionsCollection.
            updateDocument(tradedPositionObj._id,{
                position_id_in_openTradesCollection: position._id,
                size: new DecimalMath(tradedPositionObj.size).subtract(closedPositionAccumulatedDetails.qty).getResult(),
                traded_value: new DecimalMath(tradedPositionObj.traded_value) .subtract(closedPositionAccumulatedDetails.tradedValue).getResult(),
            });
        logger.info("Updated position in tradedPositionCollection db");

        const finalUpdatedTradedPosition = await mongoDatabase.collection.tradedPositionsCollection.findOne({_id:tradedPositionObj._id});
        if(finalUpdatedTradedPosition){
            await sendTradePartialCloseExecutedMessage_toUser({
                bot,
                position_direction:tradedPositionObj.direction,
                position_entry_price: tradedPositionObj.entry_price,
                position_leverage:finalUpdatedTradedPosition.leverage,
                position_pair: tradedPositionObj.pair,
                chatId: user.tg_user_id,
                trader_username:  user.atomos?"Anonymous":trader.username,
                change_by: -(tradedPositionObj.size-finalUpdatedTradedPosition.size),
                change_by_percentage:0,
                position_roi:bybit.calculateClosedPositionROI({
                    averageEntryPrice: closedPositionAccumulatedDetails.averageEntryPrice,
                    positionCurrentValue:  closedPositionAccumulatedDetails.positionCurrentValue,
                    positionSize: closedPositionAccumulatedDetails.qty
                }),
                position_pnl: closedPositionAccumulatedDetails.closedPNL
            });

        }
    }catch(error){
        const newErrorMessage = `user:${user.username}(tgId:${user.tg_user_id}) (fn:handler) ${error.message}`;
        error.message = newErrorMessage;
        onErrorCb(error);
        // throw error;
    }
    

   

}