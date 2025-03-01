//@ts-check
const { DecimalMath } = require("../../Math");
const {Bybit} = require("../../Trader");
const {
    sendNewTradeExecutedMessage_toUser,
    sendTradeExecutionFailedMessage_toUser
} = require("../../Telegram/message_templates/trade_execution");

const {newPositionSizingAlgorithm} = require("./algos/qty");
const { setUpSubAccountsForUser } = require("./setUpSubAccountsForUser");

const {calculateStopLossPrice} = require("./algos/stoploss/calculateStopLossPrice");
const { checkIfUserIsFollowingTheTrader } = require("./shared/checkIfUserIsFollowingTheTrader");
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
module.exports.newPositionHandler = async function newPositionHandler({
    logger,mongoDatabase,positionsStateDetector,bot,onErrorCb
}){ 
    const FUNCTION_NAME = "fn:newPositionHandler";
    console.log(FUNCTION_NAME);
    positionsStateDetector.onNewPosition(async (position, trader) => {
        logger.info("New Position Added To DB");
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
                try {
                    // Check that user is following the trader
                   
                    if(!await checkIfUserIsFollowingTheTrader({
                        mongoDatabase, trader,user
                    }))continue;

                    


                    console.log("Pushing handler async functions");
                    promises.push(handler({
                        // bybit:bybitSubAccount,
                        logger,mongoDatabase,position,trader,user,
                        bot,
                        onErrorCb:(error)=>{
                            const newErrorMessage = `(fn:newPositionHandler)  trader :${trader.username}) and user :(${user.tg_user_id}) ${error.message}`;
                            error.message = newErrorMessage;
                            onErrorCb(error);
                        }
                    }));
                    

                }catch(error){
                    // Error thrown only for user but loop not to be stopped
                    const newErrorMessage = `(fn:newPositionHandler) trader :${trader.username}) and user :(${user.tg_user_id}) ${error.message}`;
                    error.message = newErrorMessage;
                    onErrorCb(error);
                }
            }

            await Promise.allSettled(promises);

  
            
        }catch(error){
            console.log({error});
            let errorMsg = "(fn:newPositionHandler) "+ (error && error.message?error.message:"");
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
    // bybit,
    logger,mongoDatabase,position,trader,user,bot,onErrorCb
}){
    const FUNCTION_NAME = "(fn:newPositionHandler) (fn:handler)";
    try{ 
        if(!user.privateKey || !user.privateKey.trim() ||!user.publicKey ||!user.publicKey.trim()){
            throw new Error("NO API KEYS PRESENT IN USER DOCUMENT");
        }
        
        const compareArrays = function(array1, array2) {
            let allSynced = true;
            array1.forEach(obj1 => {
                // Find matching object in array2 based on 'sub_link_name'
                const obj2 = array2.find(obj => obj.sub_link_name === obj1.sub_link_name);
        
                if (obj2) {
                    // Check if 'trader_uid', 'trader_username' and 'weight' match
                    if (obj1.trader_uid === obj2.trader_uid &&
                        obj1.trader_username === obj2.trader_username &&
                        obj1.weight === obj2.weight) {
        
                        // If they match, add object to result array with subAccountIsSetAndReady = true
                    } else {
                        // If they don't match, add object to result array with subAccountIsSetAndReady = false
                        allSynced = false;
                    }
                }else {
                    allSynced = false;
                }
            });
        
            return allSynced;
        };
        //////////////////
        /**
         * Validate if user subaccounts are accurate
         */
        const userSubAccountConfigDocuments = user.atomos===true? await (await mongoDatabase.collection.subAccountsConfigCollection.getAllDocuments()).toArray() : user.custom_sub_account_configs;
        const userSubAccountDocuments = await (await mongoDatabase.collection.subAccountsCollection.getAllDocumentsBy({tg_user_id:user.tg_user_id, testnet:user.testnet}) ).toArray();
        console.log({userSubAccountConfigDocuments});
        console.log({userSubAccountDocuments});
        // let subAccountsAreSetAndReady = true;
        let subAccountsAreSetAndReady = compareArrays(userSubAccountConfigDocuments,userSubAccountDocuments);
        // for(const subAccountConfigDocument of userSubAccountConfigDocuments){
        //     let subAccountIsSetAndReady = false;
        //     userSubAccountDocuments.forEach((subAccount)=>{
        //         if(
        //             subAccount.sub_link_name === subAccountConfigDocument.sub_link_name &&
        //             subAccount.trader_uid === subAccountConfigDocument.trader_uid  &&
        //             subAccount.trader_username === subAccountConfigDocument.trader_username  &&
        //             subAccount.weight === subAccountConfigDocument.weight  
        //         ){
        //             subAccountIsSetAndReady = true;  
        //         }
        //     });
        //     if(subAccountIsSetAndReady===false){
        //         subAccountsAreSetAndReady = false;
        //     }
        // } 
        console.log({subAccountsAreSetAndReady});
        if(subAccountsAreSetAndReady===false){
            // set up sub accounts for user
            await setUpSubAccountsForUser({
                mongoDatabase,user,
                tg_user_bot: bot,
                // onError:async (error)=>{
                //     await sendTradeExecutionFailedMessage_toUser({
                //         bot,
                //         chatId: user.chatId,
                //         position_direction: position.direction,
                //         position_entry_price: position.entry_price,
                //         position_leverage: position.leverage,
                //         position_pair: position.pair,
                //         reason:error.message,
                //         trader_username: trader.username
                //     });
                // }
            });
        }  

        ////////////////////////////////////////////////
        /**
         * Connect to user subaccount Bybit Account
         */


        // Login to user's sub account of this trader
        const subAccountDocument = await mongoDatabase.collection.subAccountsCollection.findOne({
            tg_user_id: user.tg_user_id,
            trader_uid: trader.uid,
            testnet: user.testnet 
        });
        if(!subAccountDocument) {
            throw new Error("No SubAccount found for trader in SubAccountDocument");
        }

        if(!user.privateKey.trim() ||!user.publicKey.trim()){
            throw new Error("NO API KEYS PRESENT IN USER DOCUMENT");
        }

        if(!subAccountDocument.weight ||Number(subAccountDocument.weight)===0){
            throw new Error(`Sub Acccount weight ===${subAccountDocument.weight}`);
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



        /////////////////////////////////////////
        const bybit = bybitSubAccount;

        const accountBalance_Resp = await bybit.clients.bybit_RestClientV5.getDerivativesCoinBalance({
            accountType: "UNIFIED",
            coin: "USDT"
        }); 
        if (!accountBalance_Resp.result || !accountBalance_Resp.result.balance) {
            console.log({ accountBalance_Resp });
            throw new Error("accountBalance_Resp"+accountBalance_Resp.retMsg);
        }
        const totalUSDT_balance = new DecimalMath(parseFloat(accountBalance_Resp.result.balance.walletBalance)).getResult();
        const leftBalance = new DecimalMath(parseFloat(accountBalance_Resp.result.balance.transferBalance)).getResult();
        const totalPositionsValue = totalUSDT_balance - leftBalance;

        console.log({totalUSDT_balance});
        console.log({leftBalance});
        console.log({totalPositionsValue});


        logger.info("Calculate percentageBased_DynamicPositionSizingAlgo");
        const {sizesToExecute, symbolLotStepSize, symbolMaxLotSize} = await newPositionSizingAlgorithm({
            bybit,
            position,
            trader, 
            mongoDatabase,
            action:"new_trade",
            user,
            //need to pass totalUSDT_balance in newPositionSizingAlgorithm
            totalUSDT_balance,
            telegram_userMessagingBot:bot,
            decimal_allocation: subAccountDocument.allocation
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


        await runPositionSetupsBeforeExecution({
            bybit,position,
            onError:(error)=>{
                logger.error(`${FUNCTION_NAME} ${error.message}`);
            }
        });

        

        
        const {openPositionsRes} = await bybit.clients.bybit_RestClientV5.openANewPosition({
            orderParams: {
                category:"linear",
                orderType:"Market",
                qty:String(total_standardized_qty),//String(symbolInfo.lot_size_filter.min_trading_qty),
                side: position.direction==="LONG"?"Buy":"Sell",
                symbol: position.pair,
                positionIdx:position.direction==="LONG"?1:2, //Used to identify positions in different position modes. Under hedge-mode, this param is required 0: one-way mode  1: hedge-mode Buy side 2: hedge-mode Sell side
                stopLoss: String(await bybit.standardizedPrice({// Standradize price
                    price:calculateStopLossPrice({
                        direction: position.direction, 
                        entry_price: position.entry_price,
                        leverage: position.leverage
                    }), 
                    symbol:position.pair
                })) 
            },
            symbolLotStepSize,
            symbolMaxLotSize
        });
      

  
        let someOpenIsSucccessful = false;
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
                    reason: "Trade Execution Error: "+openPositionRes.retMsg
                });
            }else {
                someOpenIsSucccessful = true;
                logger.info("Position opened on bybit_RestClientV5");
            }
        }

        if(someOpenIsSucccessful){
            const theTradeInBybit = await bybit.helpers.getActualOpenPositionInBybit({
                bybit,
                category:"linear",
                side:position.direction==="LONG"?"Buy":"Sell",
                symbol: position.pair
            });
            console.log({theTradeInBybit});
     
            const nowDate = new Date();
            const tradedValue = new DecimalMath(parseFloat(theTradeInBybit.positionValue)).divide(position.leverage).getResult();
            await mongoDatabase.collection.tradedPositionsCollection.createNewDocument({
                // entry_price: parseFloat(theTradeInBybit.avgPrice),
                entry_price: new DecimalMath(parseFloat(theTradeInBybit.avgPrice)).truncateToDecimalPlaces(6).getResult(),
                testnet: user.testnet,
                leverage: position.leverage,
                pair: position.pair,
                position_id_in_openTradesCollection: position._id,
                size: parseFloat(theTradeInBybit.size), 
                status: "OPEN",
                trader_uid: trader.uid,
                trader_username: trader.username?trader.username:"",
                entry_datetime: new Date(parseFloat(theTradeInBybit.createdTime)),
                direction: position.direction,
                traded_value: tradedValue,
                tg_user_id: user.tg_user_id,
                actual_position_leverage: position.leverage,
                actual_position_original_size: position.size,
                actual_position_size: position.size,
                document_created_at_datetime: nowDate,
                document_last_edited_at_datetime: nowDate,
                //@ts-ignore
                position_id_in_oldTradesCollection: null,
                server_timezone: process.env.TZ?process.env.TZ:"",
                closed_roi_percentage: 0,
                close_price: 0,
                closed_pnl: 0, 
                
                
            });
            logger.info("Saved the position to DB");

            const subCapital = totalUSDT_balance;//@todo hho to calculate this
            // Send message to user
            await sendNewTradeExecutedMessage_toUser({
                bot,
                position_direction:position.direction,
                position_entry_price: new DecimalMath(parseFloat(theTradeInBybit.avgPrice)).truncateToDecimalPlaces(6).getResult(),
                position_leverage:position.leverage,
                position_pair: position.pair,
                chatId: user.tg_user_id,
                trader_username:  trader.username,
                position_value: new DecimalMath(tradedValue).truncateToDecimalPlaces(2).getResult(),
                position_value_percentage_of_sub_capital: (tradedValue/subCapital)*100
            });

        }

        


         

    }catch(error){
        error.message = "Trade Execution Error: "+error.message;
        await sendTradeExecutionFailedMessage_toUser({
            bot,
            chatId: user.chatId,
            position_direction: position.direction,
            position_entry_price: position.entry_price,
            position_leverage: position.leverage,
            position_pair: position.pair,
            trader_username: trader.username,
            reason: error.message
            // reason: "Trade Execution Error: NO API KEYS PRESENT IN SUBACCOUNT"
        });
        const newErrorMessage = `(fn:handler) trader:${trader.username} user:${user.username} user_tg_id:${user.tg_user_id} ${error.message}`;
        error.message = newErrorMessage;
        onErrorCb(error);
        // throw error;
    }

}