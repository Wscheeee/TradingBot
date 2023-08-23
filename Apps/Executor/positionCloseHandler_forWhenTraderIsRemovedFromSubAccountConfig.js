
//@ts-check

const {Bybit} = require("../../Trader");
const {sendTradeFullCloseEecutedMessage_toUser, sendTradeExecutionFailedMessage_toUser} = require("../../Telegram/message_templates/trade_execution");

const {newPositionSizingAlgorithm} = require("./algos/qty");

const {sleepAsync} = require("../../Utils/sleepAsync");
const { calculateRoiFromPosition } = require("../ScrapeFollowedTradersPositions/calculateRoiFromPosition");
const { runPositionSetupsBeforeExecution } = require("./shared/runPositionSetupsBeforeExecution");

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
module.exports.positionCloseHandler_forWhenTraderIsRemovedFromSubAccountConfig = async function positionCloseHandler_forWhenTraderIsRemovedFromSubAccountConfig({
    logger,mongoDatabase,positionsStateDetector,bot,onErrorCb
}){
    const FUNCTION_NAME = "(fn:positionCloseHandler_forWhenTraderIsRemovedFromSubAccountConfig)";
    console.log(FUNCTION_NAME);
    positionsStateDetector.onPositionClose_forTraderRemovedFromAtomosConfig(async (position, trader) => {
        const FUNCTION_NAME = "(fn:positionsStateDetector.onPositionClose_forTraderRemovedFromAtomosConfig)";
        console.log(FUNCTION_NAME);
        logger.info(FUNCTION_NAME);
        try{

            /****
             * Get all users cursor for users that follow atomos config
             * 
             */
            const users_Cursor = await mongoDatabase.collection.usersCollection.getAllDocumentsBy({
                status:true,
                atomos: true
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
                            const newErrorMessage = `${FUNCTION_NAME}  trader :${trader.username}) and user :(${user.tg_user_id}) ${error.message}`;
                            error.message = newErrorMessage;
                            onErrorCb(error);
                        }
                    }));
                    
                
                    
                }catch(error){
                    // Error thrown only for user but loop not to be stopped
                    const newErrorMessage = `${FUNCTION_NAME} trader :${trader.username}) and user :(${user.tg_user_id}) ${error.message}`;
                    error.message = newErrorMessage;
                    onErrorCb(error);
                }
            }
            await Promise.allSettled(promises);

            
        }catch(error){
            console.log({error});
            let errorMsg = FUNCTION_NAME+(error && error.message?error.message:"");
            errorMsg+=" ("+position.pair+")";
            logger.error(JSON.stringify(errorMsg));
        }

    });
    positionsStateDetector.onPositionClose_forTraderRemovedFromUserCustomConfig(async (position, trader) => {
        const FUNCTION_NAME = "(fn:positionsStateDetector.onPositionClose_forTraderRemovedFromUserCustomConfig)";
        console.log(FUNCTION_NAME);
        logger.info(FUNCTION_NAME);
        try{
            if(!position.tg_user_id)throw new Error(`position.tg_user_id for ${FUNCTION_NAME} not present in position:oldTrades`);
            /****
             * Get all users cursor for users that follow own custom config and h
             * 
             */
            const users_Cursor = await mongoDatabase.collection.usersCollection.getAllDocumentsBy({
                status:true,
                atomos: false,
                tg_user_id:position.tg_user_id
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
                            const newErrorMessage = `${FUNCTION_NAME}  trader :${trader.username}) and user :(${user.tg_user_id}) ${error.message}`;
                            error.message = newErrorMessage;
                            onErrorCb(error);
                        }
                    }));
                    
                
                    
                }catch(error){
                    // Error thrown only for user but loop not to be stopped
                    const newErrorMessage = `${FUNCTION_NAME} trader :${trader.username}) and user :(${user.tg_user_id}) ${error.message}`;
                    error.message = newErrorMessage;
                    onErrorCb(error);
                }
            }
            await Promise.allSettled(promises);

            
        }catch(error){
            console.log({error});
            let errorMsg = FUNCTION_NAME+(error && error.message?error.message:"");
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
        if(!user.privateKey || !user.privateKey.trim() ||!user.publicKey ||!user.publicKey.trim()){
            throw new Error("NO API KEYS PRESENT IN USER DOCUMENT");
        }
        /////////////////////////////////////////////

        /**
         * Connect to user Bybit Account
         */
        // Login to user's sub account of this trader
        const subAccountDocument = await mongoDatabase.collection.subAccountsCollection.findOne({
            tg_user_id: user.tg_user_id,
            trader_uid: trader.uid,
            testnet: user.testnet 
        });
        if(!subAccountDocument) {
            // await sendTradeExecutionFailedMessage_toUser({
            //     bot,
            //     chatId: user.chatId,
            //     position_direction: position.direction,
            //     position_entry_price: position.entry_price,
            //     position_leverage: position.leverage,
            //     position_pair: position.pair,
            //     trader_username:  trader.username,
            //     reason: "Position Close Error: No SubAccount found for trader"
            // });
            throw new Error(`No SubAccount found for trader :${user.atomos===false?trader.username:"Anonymous"}) and user :(${user.tg_user_id}) `);
        }
        if(!subAccountDocument.private_api.trim() ||!subAccountDocument.public_api.trim()){
            // await sendTradeExecutionFailedMessage_toUser({
            //     bot,
            //     chatId: user.chatId,
            //     position_direction: position.direction,
            //     position_entry_price: position.entry_price,
            //     position_leverage: position.leverage,
            //     position_pair: position.pair,
            //     trader_username:  trader.username,
            //     reason: "Position Close Error: NO API KEYS PRESENT IN SUBACCOUNT"
            // });
            throw new Error("NO API KEYS PRESENT IN SUBACCOUNT");
        }
        const bybitSubAccount = new Bybit({
            millisecondsToDelayBetweenRequests: 7000,
            privateKey: subAccountDocument.private_api,
            publicKey: subAccountDocument.public_api,
            testnet: subAccountDocument.testnet===false?false:true
        });



        ////////////////////////////////////////////
        const bybit = bybitSubAccount; 

        /**
                 * Get the open tradersPositions in DB
                 */
        let tradedPositionObj = await mongoDatabase.collection.tradedPositionsCollection.findOne({
            status:"OPEN",
            pair: position.pair,
            direction: position.direction,
            leverage: position.leverage,
            trader_uid: trader.uid,
            tg_user_id: user.tg_user_id,
            testnet: user.testnet
        });
        if(!tradedPositionObj){
            // Retry after some duration in case a position was opened and closed quickly before the open transaction was completed: 1min
            await sleepAsync((1000*60));
            tradedPositionObj = await mongoDatabase.collection.tradedPositionsCollection.findOne({
                status:"OPEN",
                pair: position.pair,
                direction: position.direction,
                leverage: position.leverage,
                trader_uid: trader.uid,
                tg_user_id: user.tg_user_id,
                testnet: user.testnet
            });
            if(!tradedPositionObj){
                throw new Error("Position setting out to close was never traded/open");
            }
        }

    
        /**
     * Get the qty of the partial to close
    **/    
        const {sizesToExecute, symbolLotStepSize, symbolMaxLotSize} = await newPositionSizingAlgorithm({
            bybit,
            position,
            trader,
            mongoDatabase,
            action:"trade_close",
            user,
            telegram_userMessagingBot:bot,
            decimal_allocation: subAccountDocument.allocation
        });
        const sizeToExecute = sizesToExecute[0];
        console.log({sizesToExecute,sizeToExecute});
        
        if(sizeToExecute===0||!sizeToExecute)throw new Error("sizeToExecute==="+sizeToExecute);
        const total_standardized_qty = sizesToExecute.reduce((a,b)=>a+b,0);
        console.log({total_standardized_qty});
        
        // await runPositionSetupsBeforeExecution({
        //     bybit,position,
        //     onError:(error)=>{
        //         logger.error(`${FUNCTION_NAME} ${error.message}`);
        //     }
        // });
    
        //     /**
        //  * Get the position
        //  */
        //     const theTradeInBybit = await bybit.helpers.getActualOpenPositionInBybit({
        //         bybit,
        //         category:"linear",
        //         side:position.direction==="LONG"?"Buy":"Sell",
        //         symbol: position.pair
        //     });
           
        
        /**
         * Close the order
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
            avgEntryPrice: 0,
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
                logger.error("closePositionRes:"+closePositionRes.retMsg);
                await sendTradeExecutionFailedMessage_toUser({
                    bot,
                    chatId: user.chatId,
                    position_direction: position.direction,
                    position_entry_price: position.entry_price,
                    position_leverage: position.leverage,
                    position_pair: position.pair,
                    trader_username:  trader.username,
                    reason: "Position Close Error: closePositionRes: "+closePositionRes.retMsg
                });
            }else {
                someCloseIsSucccessful = true;
                logger.info("Position closed on bybit_RestClientV5");
                logger.info("Get closed position info");
                ////////////////////////////////////////////////
                /// Added for a little delay
            
                // const getClosedPostionOrderHistory_Res = await bybit.clients.bybit_RestClientV5.getOrderHistory({
                //     category:"linear",
                //     symbol: position.pair,
                //     orderId: closePositionRes.result.orderId
                // });
                // if(getClosedPostionOrderHistory_Res.retCode!==0)throw new Error(getClosedPostionOrderHistory_Res.retMsg);
                // console.log("getClosedPostionOrderHistory_Res");
                // console.log(getClosedPostionOrderHistory_Res.result);
            
                // const getClosedPositionInfo_res = await bybit.clients.bybit_RestClientV5.getClosedPositionInfo({
                //     category:"linear",
                //     orderId:closePositionRes.result.orderId
                    
                // });
                // console.log({
                //     getClosedPositionInfo_res: getClosedPositionInfo_res.result.list
                // });
            
                // await sleepAsync(20000);
        
                ///////////////////////////////////////////////////
                // const orderHistory_Res = await bybit.clients.bybit_RestClientV5.getOrderHistory({
                //     category:"linear",
                //     symbol: position.pair,
                //     // orderId: closePositionRes.result.orderId
                // });
                // if(orderHistory_Res.retCode!==0)throw new Error("orderHistory_Res: "+orderHistory_Res.retMsg);
                // const orderInfoObj = orderHistory_Res.result.list.find((order)=>order.orderId===closePositionRes.result.orderId);
                // if(!orderInfoObj)throw new Error("orderInfoObj not found in history");
                // console.log({orderInfoObj});


                
                const closedPositionPNLObj = await bybit.helpers.getClosedPositionPNLObject({
                    bybit,
                    category:"linear",
                    symbol: position.pair,
                    closedPositionOrderId: closePositionRes.result.orderId
                });
                
                let closedPartialPNL  = parseFloat(closedPositionPNLObj.closedPnl);
                closedPositionAccumulatedDetails.closedlPNL+=closedPartialPNL;
                closedPositionAccumulatedDetails.avgExitPrice =  parseFloat(closedPositionPNLObj.avgExitPrice);
                closedPositionAccumulatedDetails.avgEntryPrice =  parseFloat(closedPositionPNLObj.avgEntryPrice);
                closedPositionAccumulatedDetails.leverage =  parseFloat(closedPositionPNLObj.leverage);
                closedPositionAccumulatedDetails.qty +=  parseFloat(closedPositionPNLObj.qty);
                closedPositionAccumulatedDetails.close_datetime =  new Date(parseFloat(closedPositionPNLObj.updatedTime));
                closedPositionAccumulatedDetails.averageEntryPrice =  parseFloat(closedPositionPNLObj.avgEntryPrice);
                closedPositionAccumulatedDetails.positionCurrentValue +=  parseFloat(closedPositionPNLObj.cumExitValue);
            }
    
        }
     
        console.log({someCloseIsSucccessful});
        if(!someCloseIsSucccessful){
            throw new Error(" None of the close positions was successful");
            // logger.error("None of the close position was successfull");
            // return;
        }
    
        console.log({closedPositionAccumulatedDetails});
        
        // if close is successful // update the traded position db
        const tradedOpenPositionDocument = await mongoDatabase.
            collection.
            tradedPositionsCollection.
            findOne({
                direction:position.direction,
                pair: position.pair,
                trader_uid: trader.uid,
                tg_user_id: user.tg_user_id,
                testnet: user.testnet
            });
        logger.info("Return from mongoDatabase.collection.tradedPositionsCollection.getOneOpenPositionBy");
        if(!tradedOpenPositionDocument){
            await sendTradeExecutionFailedMessage_toUser({
                bot,
                chatId: user.chatId,
                position_direction: position.direction,
                position_entry_price: position.entry_price,
                position_leverage: position.leverage,
                position_pair: position.pair,
                trader_username:  trader.username,
                reason: "Position Close Error: Position open in Bybit is not found in DB"
            });
            logger.warn("Position Close Error: Position open in Bybit is not found in DB");
        }else { 
            logger.info("Position in Bybit found in DB");
            await mongoDatabase.collection.tradedPositionsCollection.
                updateDocument(tradedOpenPositionDocument._id,{
                    close_price: closedPositionAccumulatedDetails.avgExitPrice,
                    closed_pnl: closedPositionAccumulatedDetails.closedlPNL,
                    closed_roi_percentage: calculateRoiFromPosition({
                        close_price: closedPositionAccumulatedDetails.avgExitPrice,
                        direction: position.direction,
                        entry_price:closedPositionAccumulatedDetails.avgEntryPrice,
                        leverage: position.leverage,
                        size: closedPositionAccumulatedDetails.qty
                    }),
                    leverage: closedPositionAccumulatedDetails.leverage,
                    position_id_in_oldTradesCollection: position._id,
                    size: closedPositionAccumulatedDetails.qty,
                    status: "CLOSED",
                    close_datetime: closedPositionAccumulatedDetails.close_datetime,
                    document_last_edited_at_datetime: new Date(),
                });
            logger.info("Closed position in tradedPositionCollection db");
            // Send message to user
            await sendTradeFullCloseEecutedMessage_toUser({
                bot,
                position_direction:tradedOpenPositionDocument.direction,
                position_exit_price: closedPositionAccumulatedDetails.avgExitPrice,
                position_leverage:tradedOpenPositionDocument.leverage,
                position_pair: tradedOpenPositionDocument.pair,
                chatId: user.tg_user_id,
                trader_username:  trader.username,
                position_roi: calculateRoiFromPosition({
                    close_price: closedPositionAccumulatedDetails.avgExitPrice,
                    direction: position.direction,
                    entry_price:closedPositionAccumulatedDetails.avgEntryPrice,
                    leverage: position.leverage,
                    size: closedPositionAccumulatedDetails.qty
                }),
                position_pnl: closedPositionAccumulatedDetails.closedlPNL
            });
        }
        // Delete tthe added oldTradedDOCUMENT.
        await mongoDatabase.collection.oldTradesCollection.deleteManyDocumentsByIds([position._id]);


    }catch(error){
        error.message = "Position Close Error: "+error.message;
        await sendTradeExecutionFailedMessage_toUser({
            bot,
            chatId: user.chatId,
            position_direction: position.direction,
            position_entry_price: position.entry_price,
            position_leverage: position.leverage,
            position_pair: position.pair,
            trader_username: trader.username,
            reason: error.message
            // reason: "Position Close Error: NO API KEYS PRESENT IN USER DOCUMENT"
        });
        const newErrorMessage = `user:${user.tg_user_id} trader:${trader.username} (fn:handler) ${error.message}`;
        error.message = newErrorMessage;
        onErrorCb(error);
        // throw error;
    }

    

}