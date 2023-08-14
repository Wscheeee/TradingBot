//@ts-check
const { DecimalMath } = require("../../Math");
const {Bybit} = require("../../Trader");
const {
    sendTradeLeverageUpdateExecutedMessage_toUser,
    sendTradeUpdateSizeExecutedMessage_toUser,
    sendTradeExecutionFailedMessage_toUser
} = require("../../Telegram/message_templates/trade_execution");

const { newPositionSizingAlgorithm } = require("./algos/qty");
const { calculatePercentageChange } = require("../../Math/calculatePercentageChange");
const { sleepAsync } = require("../../Utils/sleepAsync");
const { calculateStopLossPrice } = require("./algos/stoploss/calculateStopLossPrice");
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
module.exports.positionUpdateHandler = async function positionUpdateHandler({
    logger, mongoDatabase, positionsStateDetector,bot,onErrorCb
}) {
    console.log("fn:positionUpdateHandler");
    positionsStateDetector.onUpdatePosition(async (previousPositionDocument,position, trader) => {
        logger.info("Position updated On DB");
        try {
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
                    // Check that user is following the trader
                   
                    if(!await checkIfUserIsFollowingTheTrader({
                        mongoDatabase, trader,user
                    }))continue;
                
                    promises.push(handler({
                        logger,
                        mongoDatabase,
                        position,
                        trader,
                        user,
                        bot,
                        onErrorCb:(error)=>{
                            const newErrorMessage = `(fn:positionUpdateHandler)  trader :${trader.username}) and user :(${user.tg_user_id}) ${error.message}`;
                            error.message = newErrorMessage;
                            onErrorCb(error);
                        }
                    }));
                    

                }catch(error){
                    // Error thrown only for user but loop not to be stopped
                    const newErrorMessage = `(fn:positionUpdateHandler) trader :${trader.username}) and user :(${user.tg_user_id}) ${error.message}`;
                    error.message = newErrorMessage;
                    onErrorCb(error);
                }

            }
            await Promise.allSettled(promises);



        } catch (error) {
            console.log({ error });
            let errorMsg = "(fn:positionUpdateHandler) " + (error && error.message ? error.message : "");
            errorMsg += " (" + position.pair + ")";
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
* }} param0 
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
         * Connect to user Bybit SubAccount Account
         */
        const subAccountDocument = await mongoDatabase.collection.subAccountsCollection.findOne({
            tg_user_id: user.tg_user_id, 
            trader_uid: trader.uid,
            testnet: user.testnet 
        });
        console.log({trader});
        console.log({subAccountDocument});
        if(!subAccountDocument) {
            throw new Error("No SubAccount found in subAccountDocument for trader");
        }
        if(!subAccountDocument.private_api.trim() ||!subAccountDocument.public_api.trim()){
            throw new Error("NO API KEYS PRESENT IN SUBACCOUNT");
        }
        console.log({subAccountDocument});
        const bybitSubAccount = new Bybit({
            millisecondsToDelayBetweenRequests: 7000,
            privateKey: subAccountDocument.private_api,
            publicKey: subAccountDocument.public_api,
            testnet: subAccountDocument.testnet===false?false:true
        });


        /////////////////////////////////////////////
        const bybit = bybitSubAccount;

        /**
         * Check that the position is in db
         * */
        let tradedPositionObj = await mongoDatabase.
            collection.
            tradedPositionsCollection.
            findOne({
                direction: position.direction,
                pair: position.pair,
                trader_uid: trader.uid,
                testnet: user.testnet
            });
        logger.info("Return from mongoDatabase.collection.tradedPositionsCollection.getOneOpenPositionBy");
    
        if (!tradedPositionObj) {
            // Retry after some duration in case a position was opened and closed quickly before the open transaction was completed: 1min
            await sleepAsync((1000*60));
            tradedPositionObj = await mongoDatabase.
                collection.
                tradedPositionsCollection.
                findOne({
                    direction: position.direction,
                    pair: position.pair,
                    trader_uid: trader.uid,
                    testnet: user.testnet
                });
            if(!tradedPositionObj){
                throw new Error("Position to update not in DB meaning it was not traded");
            }
        }
        logger.info("Position found in db: Working on it");
    
        /**
         * Get the position
         */
        const theTradeInBybit = await bybit.helpers.getActualOpenPositionInBybit({
            bybit,
            category:"linear",
            side:position.direction==="LONG"?"Buy":"Sell",
            symbol: position.pair
        });
       
 
    
        
        /**
         * Switch position mode
         * */
        const switchPositionMode_Res = await bybit.clients.bybit_LinearClient.switchPositionMode({
            mode: "BothSide",// 3:Both Sides
            symbol: position.pair,
        });
        if (String(switchPositionMode_Res.ext_code) !== "0") {
        // an error
            logger.error("switchPositionMode_Res: " + "" + switchPositionMode_Res.ret_msg);
        }
        /**
         * Switch margin
         * */
        const setPositionLeverage_Resp = await bybit.clients.bybit_LinearClient.switchMargin({
            is_isolated: false,
            buy_leverage: 1,
            sell_leverage: 1,
            symbol: position.pair
        });
        if (setPositionLeverage_Resp.ret_code !== 0) {
        // an error
            logger.error("setPositionLeverage_Resp: " + setPositionLeverage_Resp.ret_msg + "(" + position.pair + ")");
        }
    
        /**
         * Set position leverage
         * */
        const setUserLeverage_Res = await bybit.clients.bybit_LinearClient.setUserLeverage({
            buy_leverage: position.leverage,
            sell_leverage: position.leverage,
            symbol: position.pair
        });
        if (setUserLeverage_Res.ret_code !== 0) {
        // an error
            logger.error("setUserLeverage_Res: " + setUserLeverage_Res.ret_msg + "(" + position.pair + ")");
        }

        /**
         * Get total USDT balance
         */
        const accountBalance_Resp = await bybit.clients.bybit_RestClientV5.getDerivativesCoinBalance({
            accountType: "UNIFIED",
            coin: "USDT"
        }); 
        if (!accountBalance_Resp.result || !accountBalance_Resp.result.balance) {
            console.log({ accountBalance_Resp });
            throw new Error("accountBalance_Resp: "+accountBalance_Resp.retMsg);
        }
        const totalUSDT_balance = new DecimalMath(parseFloat(accountBalance_Resp.result.balance.walletBalance)).getResult();
        const leftBalance = new DecimalMath(parseFloat(accountBalance_Resp.result.balance.transferBalance)).getResult();
        const totalPositionsValue = totalUSDT_balance - leftBalance;

        console.log({totalUSDT_balance});
        console.log({leftBalance});
        console.log({totalPositionsValue});

        /**
         * Calculate the updated qty
         */
        // logger.info("Calculate percentageBased_DynamicPositionSizingAlgo");
        const {sizesToExecute, symbolLotStepSize, symbolMaxLotSize} = await newPositionSizingAlgorithm({
            bybit,
            position,
            trader,
            mongoDatabase,
            action:"new_trade",
            user,
            totalUSDT_balance,
            telegram_userMessagingBot:bot
        });
        const sizeToExecute = sizesToExecute[0];
        console.log({sizesToExecute,sizeToExecute});
        
        if(sizeToExecute===0||!sizeToExecute)throw new Error("sizeToExecute==="+sizeToExecute);
        const total_standardized_qty = sizesToExecute.reduce((a,b)=>a+b,0);
        console.log({total_standardized_qty});
        /***
         * SECURITY:
         * don't execute if more than 35% of capital is used
         */
        const tradeValue = new DecimalMath(total_standardized_qty).multiply(position.entry_price).divide(position.leverage).getResult();
      
        // total opened valu / totalusdt capital *100
        // if value > 35
        const openValuePercentageOfCapital = new DecimalMath(totalPositionsValue+tradeValue).divide(totalUSDT_balance).multiply(100).getResult();
        if(openValuePercentageOfCapital>35){
            throw new Error("more than 35% of capital used for trader");
        }

        /***
         * Calculate new avg entry price
         */
        const initial_entry_price = new DecimalMath(theTradeInBybit.avgPrice);
        const initial_size = new DecimalMath(theTradeInBybit.size);
        const added_entry_price = new DecimalMath(position.mark_price);
        const added_size = new DecimalMath(total_standardized_qty);
        
        const initial_total = initial_entry_price.multiply(initial_size.getResult());
        const added_total = added_entry_price.multiply(added_size.getResult());
        
        const combined_total = initial_total.add(added_total.getResult());
        const combined_size = initial_size.add(added_size.getResult());

        let avgEntryPrice = combined_total.divide(combined_size.getResult()).getResult();



        if(parseFloat(theTradeInBybit.size)<total_standardized_qty){
            console.log("Position Size increased");
            const qty_to_execute = total_standardized_qty - parseFloat(theTradeInBybit.size);
            console.log({qty_to_execute});
            // Means that size was added
            const {openPositionsRes} = await bybit.clients.bybit_RestClientV5.openANewPosition({
                orderParams: {
                    category:"linear",
                    orderType:"Market",
                    qty:String(qty_to_execute),//String(symbolInfo.lot_size_filter.min_trading_qty),
                    side: position.direction==="LONG"?"Buy":"Sell",
                    symbol: position.pair,
                    positionIdx:position.direction==="LONG"?1:2, //Used to identify positions in different position modes. Under hedge-mode, this param is required 0: one-way mode  1: hedge-mode Buy side 2: hedge-mode Sell side
                    stopLoss: String(await bybit.standardizedPrice({
                        price:calculateStopLossPrice({
                            direction: position.direction,
                            // entry_price: parseFloat(theTradeInBybit.avgPrice),
                            entry_price: avgEntryPrice,
                            leverage: position.leverage
                        }),
                        symbol: position.pair
                    }))
                },
                symbolLotStepSize,
                symbolMaxLotSize
            });


            let someCloseIsSucccessful = false;
            // const closedPositionAccumulatedDetails = {
            //     closedlPNL:0,
            //     avgExitPrice: 0,
            //     leverage: 0,
            //     qty: 0,
            //     close_datetime:new Date(),
            //     averageEntryPrice: 0,
            //     positionCurrentValue: 0
            // };
            // Loop through closePositionsRes 
            for (const openPositionResObj of openPositionsRes){
                const openPositionRes = openPositionResObj.response;
                if(openPositionRes.retCode!==0){
                // throw new Error(openPositionRes.retMsg);
                //instead send error message 
                    logger.error("openPositionRes:"+openPositionRes.retMsg);
                    await sendTradeExecutionFailedMessage_toUser({
                        bot,
                        chatId: user.chatId,
                        position_direction: position.direction,
                        position_entry_price: position.entry_price,
                        position_leverage: position.leverage,
                        position_pair: position.pair,
                        trader_username:  trader.username,
                        reason: "Position Update Error: openPositionRes:"+openPositionRes.retMsg
                    });
                }else {
                    someCloseIsSucccessful = true;
                    logger.info("Position closed on bybit_RestClientV5");
                    logger.info("Get closed position info");
                }
            }

            console.log({someCloseIsSucccessful});


            
       

        }else {
            console.log("Only Leverage was updated");
        }


    
        /**
         * Get the position again
         */
        // console.log({getOpenPosiion_Result});
        const theTradeInBybit_again =  await bybit.helpers.getActualOpenPositionInBybit({
            bybit,
            category:"linear",
            side:position.direction==="LONG"?"Buy":"Sell",
            symbol: position.pair
        });
        console.log({theTradeInBybit_again});
    
        // update the TradedTrades db document
        await mongoDatabase.collection.tradedPositionsCollection.
            updateDocument(tradedPositionObj._id, {
                leverage: parseFloat(String(theTradeInBybit_again.leverage||tradedPositionObj.leverage)),
                server_timezone: process.env.TZ,
                size: parseFloat(theTradeInBybit_again.size),
                traded_value: (new DecimalMath(parseFloat(theTradeInBybit_again.positionValue)).divide(parseFloat(theTradeInBybit_again.leverage||String(position.leverage)))).getResult(),
                document_last_edited_at_datetime: new Date(),
                entry_price: parseFloat(theTradeInBybit_again.avgPrice),
                // order_id: updatePositionRes.result.orderId
            });
        logger.info("Updated position in tradedPositionCollection db");

        
        console.log({
            "theTradeInBybit_again.size":theTradeInBybit_again.size,
            "theTradeInBybit.size":theTradeInBybit.size
        });
 
        if(parseFloat(theTradeInBybit.size)<total_standardized_qty){ 
        // if(position.size !=){ 
            // size changed
            await sendTradeUpdateSizeExecutedMessage_toUser({
                bot,
                position_direction:tradedPositionObj.direction,
                position_entry_price: parseFloat(theTradeInBybit_again.avgPrice),
                position_leverage:tradedPositionObj.leverage,
                position_pair: tradedPositionObj.pair,
                chatId: user.tg_user_id,
                trader_username:  trader.username,
                change_by: new DecimalMath(parseFloat(theTradeInBybit_again.size)).subtract(parseFloat(theTradeInBybit.size)).getResult(),
                change_percentage: calculatePercentageChange(parseFloat(theTradeInBybit_again.size),parseFloat(theTradeInBybit.size)),
            });
        }

        if(theTradeInBybit.leverage && theTradeInBybit_again.leverage && parseFloat(theTradeInBybit.leverage)!==position.leverage){
            // leverage changed
            await sendTradeLeverageUpdateExecutedMessage_toUser({
                bot,
                position_direction:position.direction,
                position_entry_price: parseFloat(theTradeInBybit_again.avgPrice),
                // position_entry_price: position.entry_price,
                position_leverage:position.leverage,
                position_pair: position.pair,
                chatId: user.tg_user_id,
                trader_username:  trader.username,
                change_by: new DecimalMath(parseFloat(theTradeInBybit_again.leverage)).subtract(parseFloat(theTradeInBybit.leverage)).getResult(),
                change_percentage: calculatePercentageChange(parseFloat(theTradeInBybit_again.leverage),parseFloat(theTradeInBybit.leverage))
                // position_roi:position.roi,
                // position_pnl: position.pnl
            });
        }

    }catch(error){
        error.message = `Position Update Error: ${error.message}`;
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




