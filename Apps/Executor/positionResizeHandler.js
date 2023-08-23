//@ts-check

const { DecimalMath } = require("../../Math");
const { calculatePercentageChange } = require("../../Math/calculatePercentageChange");
const { sendTradePartialCloseExecutedMessage_toUser, sendTradeExecutionFailedMessage_toUser } = require("../../Telegram/message_templates/trade_execution");
const {Bybit} = require("../../Trader");
const { sleepAsync } = require("../../Utils/sleepAsync");
const { calculateRoiFromPosition } = require("../ScrapeFollowedTradersPositions/calculateRoiFromPosition");

const {newPositionSizingAlgorithm} = require("./algos/qty");
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
    const FUNCTION_NAME = "(fn:positionResizeHanddler) (fn:handler)";
    try {
        if(!user.privateKey || !user.privateKey.trim() ||!user.publicKey ||!user.publicKey.trim()){
            throw new Error("NO API KEYS PRESENT IN USER DOCUMENT");
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



        /////////////////////////////////////////////
        const bybit = bybitSubAccount;
        /**
                 * Check that the position is actuall in DB
                 * Check that the position is actually open in Bybit
                 * Close part of the position
                 * Create a new tradedPosition document for the part, with status set to close
                 */
        // Check that the position is in db
        let tradedPositionObj = await mongoDatabase.
            collection.
            tradedPositionsCollection.
            findOne({
                direction:position.direction,
                pair: position.pair,
                trader_uid: trader.uid, 
                testnet: user.testnet
            });
        logger.info("Return from mongoDatabase.collection.tradedPositionsCollection.getOneOpenPositionBy");
                        
        if(!tradedPositionObj){
            // Retry after some duration in case a position was opened and closed quickly before the open transaction was completed: 1min
            await sleepAsync((1000*60));
            tradedPositionObj = await mongoDatabase.
                collection.
                tradedPositionsCollection.
                findOne({
                    direction:position.direction,
                    pair: position.pair,
                    trader_uid: trader.uid, 
                    testnet: user.testnet
                });
            if(!tradedPositionObj){
                throw new Error("Position to resize is not in DB meaning it was not traded");

            }
        }
                    
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
        const theTradeInBybit = await bybit.helpers.getActualOpenPositionInBybit({
            bybit,
            category:"linear",
            side:position.direction==="LONG"?"Buy":"Sell",
            symbol: position.pair
        });
        
        const SIZE_FOR_TRADE_IN_BYBIT_BEFORE_UPDATE = parseFloat(theTradeInBybit.size);
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
            closedPNL:0,
            avgExitPrice: 0,
            avgEntryPrice:0,
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
                logger.error("Position Resize Error: closePositionRes:"+closePositionRes.retMsg);
                await sendTradeExecutionFailedMessage_toUser({
                    bot,
                    chatId: user.chatId,
                    position_direction: position.direction,
                    position_entry_price: position.entry_price,
                    position_leverage: position.leverage,
                    position_pair: position.pair,
                    trader_username:  trader.username,
                    reason: "Position Resize Error: Close Position Error: "+closePositionRes.retMsg
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
            throw new Error("Position Resize Error: None of the close position was successfull");

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
            closed_roi_percentage: calculateRoiFromPosition({
                close_price: closedPositionAccumulatedDetails.avgExitPrice,
                direction: position.direction,
                entry_price:closedPositionAccumulatedDetails.avgEntryPrice,
                leverage: position.leverage,
                size: closedPositionAccumulatedDetails.qty
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
                traded_value: new DecimalMath(tradedPositionObj.traded_value).subtract(closedPositionAccumulatedDetails.tradedValue).getResult(),
            });
        logger.info("Updated position in tradedPositionCollection db");

        const finalUpdatedTradedPosition = await mongoDatabase.collection.tradedPositionsCollection.findOne({_id:tradedPositionObj._id});
        if(finalUpdatedTradedPosition){
            await sendTradePartialCloseExecutedMessage_toUser({
                bot,
                position_direction:tradedPositionObj.direction,
                position_exit_price: closedPositionAccumulatedDetails.avgExitPrice,
                position_leverage:finalUpdatedTradedPosition.leverage,
                position_pair: tradedPositionObj.pair,
                chatId: user.tg_user_id,
                trader_username:  trader.username,
                change_by: -(closedPositionAccumulatedDetails.qty),
                change_by_percentage:calculatePercentageChange(finalUpdatedTradedPosition.size,SIZE_FOR_TRADE_IN_BYBIT_BEFORE_UPDATE),
                position_roi:calculateRoiFromPosition({
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
        error.message = `Position Resize Error: $${error.message}`;
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
        const newErrorMessage = `user:${user.username} trader:${trader.username} (tgId:${user.tg_user_id}) (fn:handler) ${error.message}`;
        error.message = newErrorMessage;
        onErrorCb(error);
        // throw error;
    }
    

   

}