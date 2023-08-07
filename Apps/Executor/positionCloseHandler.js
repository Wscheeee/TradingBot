//@ts-check

const { sendTradeFullCloseEecutedMessage_toUser, sendTradeExecutionFailedMessage_toUser } = require("../../Telegram/message_templates/trade_execution");
const {Bybit} = require("../../Trader");

const { sleepAsync } = require("../../Utils/sleepAsync");
const { calculateRoiFromPosition } = require("../ScrapeFollowedTradersPositions/calculateRoiFromPosition");

const {newPositionSizingAlgorithm} = require("./algos/qty");
const { checkIfUserIsFollowingTheTrader } = require("./shared/checkIfUserIsFollowingTheTrader");

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
module.exports.positionCloseHandler = async function positionCloseHandler({
    logger,mongoDatabase,positionsStateDetector,bot,onErrorCb
}){
    console.log("fn:positionCloseHandler");
    positionsStateDetector.onPositionClose(async (position, trader) => {
        logger.info("Position closed On DB");
        try{

            /****
             * Get all users cursor
             * 
             */
            const users_Cursor = await mongoDatabase.collection.usersCollection.getAllDocumentsBy({
                status:true
            });
            const users_array = await users_Cursor.toArray();
            const promises = [];
            for(const user of users_array){
                try{
                    // Check that user is following the trader
                   
                    if(!await checkIfUserIsFollowingTheTrader({
                        mongoDatabase, trader,user
                    }))continue;
                    
                    promises.push(handler({
                        // bybit:bybitSubAccount,
                        logger,
                        mongoDatabase,
                        position,
                        trader, 
                        user,
                        bot,
                        onErrorCb:(error)=>{
                            const newErrorMessage = `(fn:positionCloseHandler)  trader :${trader.username}) and user :(${user.tg_user_id}) ${error.message}`;
                            error.message = newErrorMessage;
                            onErrorCb(error);
                        }
                    }));
                    
                
                    
                }catch(error){
                    // Error thrown only for user but loop not to be stopped
                    const newErrorMessage = `(fn:positionCloseHandler) trader :${trader.username}) and user :(${user.tg_user_id}) ${error.message}`;
                    error.message = newErrorMessage;
                    onErrorCb(error);
                }
            }
            await Promise.allSettled(promises);

            
        }catch(error){
            console.log({error});
            let errorMsg = "(fn:positionCloseHandler) "+(error && error.message?error.message:"");
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
            // onErrorCb(new Error(`Position Full Close Error: No SubAccount found in subAccountDocument for trader :${trader.username}) and user :(${user.tg_user_id})`));
            throw new Error("No SubAccount found in subAccountDocument for trader");
        }
        if(!subAccountDocument.private_api.trim() ||!subAccountDocument.public_api.trim()){
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
            telegram_userMessagingBot:bot
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
    
        // Switch user margin
        const setPositionLeverage_Resp = await bybit.clients.bybit_LinearClient.switchMargin({
            is_isolated: false,
            buy_leverage: 1,
            sell_leverage: 1,
            symbol: position.pair
        });
        if(setPositionLeverage_Resp.ret_code!==0){
        // an error
            logger.error("Position Full Close Error: setPositionLeverage_Resp: "+setPositionLeverage_Resp.ret_msg);
        }
        // Set user leverage
        const setUserLeverage_Res = await bybit.clients.bybit_LinearClient.setUserLeverage({
            buy_leverage: position.leverage,
            sell_leverage: position.leverage,
            symbol: position.pair
        });
        if(setUserLeverage_Res.ret_code!==0){
        // an error
            logger.error("Position Full Close Error: setUserLeverage_Res: "+""+setUserLeverage_Res.ret_msg+"("+position.pair+")");
        }
    
        //     /**
        //  * Get the position
        //  */
        //     const theTradeInBybit = await bybit.helpers.getActualOpenPositionInBybit({
        //         bybit,
        //         category:"linear",
        //         side:position.direction==="LONG"?"Buy":"Sell",
        //         symbol: position.pair
        //     });
        //     console.log({theTradeInBybit});
    
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
            closedPNL:0,
            avgExitPrice: 0,
            avgEntryPrice: 0,
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
                logger.error("Position Full Close Error: closePositionRes:"+closePositionRes.retMsg);

                await sendTradeExecutionFailedMessage_toUser({
                    bot,
                    chatId: user.chatId,
                    position_direction: position.direction,
                    position_entry_price: position.entry_price,
                    position_leverage: position.leverage,
                    position_pair: position.pair,
                    trader_username:  trader.username,
                    reason: "closePositionRes: "+closePositionRes.retMsg
                });
            }else {
                someCloseIsSucccessful = true;
                logger.info("Position closed on bybit_RestClientV5");
                logger.info("Get closed position info");
                
                const closedPositionPNLObj = await bybit.helpers.getClosedPositionPNLObject({
                    bybit,
                    category:"linear",
                    symbol: position.pair,
                    closedPositionOrderId: closePositionRes.result.orderId
                });

                let closedPartialPNL  = parseFloat(closedPositionPNLObj.closedPnl);
                closedPositionAccumulatedDetails.closedPNL+=closedPartialPNL;
                closedPositionAccumulatedDetails.avgExitPrice =  parseFloat(closedPositionPNLObj.avgExitPrice);
                closedPositionAccumulatedDetails.avgEntryPrice =  parseFloat(closedPositionPNLObj.avgEntryPrice);
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
            throw new Error("None of the close positions was successful");
       
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
            logger.warn("Position open in Bybit is not found in DB");

        }else { 
            logger.info("Position in Bybit found in DB");
            await mongoDatabase.collection.tradedPositionsCollection.
                updateDocument(tradedOpenPositionDocument._id,{
                    close_price: closedPositionAccumulatedDetails.avgExitPrice,
                    closed_pnl: closedPositionAccumulatedDetails.closedPNL,
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
                position_pnl: closedPositionAccumulatedDetails.closedPNL
            });
        }

    }catch(error){
        error.message = `Position Full Close Error: ${error.message}`;
        await sendTradeExecutionFailedMessage_toUser({
            bot,
            chatId: user.chatId,
            position_direction: position.direction,
            position_entry_price: position.entry_price,
            position_leverage: position.leverage,
            position_pair: position.pair,
            trader_username: trader.username,
            reason: error.message
        });
        const newErrorMessage = `user:${user.tg_user_id} (fn:handler) ${error.message}`;
        error.message = newErrorMessage;
        onErrorCb(error);
        // throw error;
    }

    

}



// module.exports.positionCloseHandler_HANDLER = handler;