//@ts-check
"use-strict";
/**
 * Detects traders positions and executed positins
 */

const { MongoDatabase , PositionsStateDetector} = require("../../MongoDatabase");
const { readAndConfigureDotEnv } = require("../../Utils/readAndConfigureDotEnv");
const {Logger} = require("../../Logger");
const {Telegram} = require("../../Telegram");
const {
    sendNewTradeDetectedMessage_toUser,
    sendTradeFullClosedDetectedMessage_toUser,
    sendTradeLeverageUpdateDetectedMessage_toUser,
    sendTradePartialClosedDetectedMessage_toUser,
    sendTradeSizeUpdateDetectedMessage_toUser
} = require("../../Telegram/message_templates/trade_detection");


const APP_NAME = "App:TradeSignals";
const logger = new Logger({app_name:APP_NAME});
const {IS_LIVE} = require("../../appConfig");
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE);
process.env.TZ = dotEnvObj.TZ;

(async ()=>{
    let mongoDatabase = new MongoDatabase(dotEnvObj.DATABASE_URI);
    try{
        logger.info("Start "+APP_NAME);
        /***
		 * Error Telegram bot for sendding error messages to Telegram error channel.
		 */
        const errorbot = new Telegram({telegram_bot_token:dotEnvObj.TELEGRAM_BOT_TOKEN,requestDelay:2000});
        logger.info("Create Telegrambot");
        logger.addLogCallback("error",async (cbIndex,message)=>{
            // FILTER OUT SOME MESSAGES
            const messagesToFilterOut= [
                "leverage not modified",
                "Isolated not modified",
                "position mode not modified"
            ];
            const messageIsUnwanted = messagesToFilterOut.filter((filterText)=>{
                if(message.includes(filterText)){
                    return filterText;

                } 
            });
            if(messageIsUnwanted.length===0){
                await errorbot.sendMessage(dotEnvObj.TELEGRAM_ERROR_CHHANNEL_ID,message);

            }
                
            logger.info("Send error message to telegram error channel");
        });


        logger.info("Create DB");
        await mongoDatabase.connect(dotEnvObj.DATABASE_NAME);
        logger.info("Connect DB");
        const positionsStateDetector = new PositionsStateDetector({ mongoDatabase: mongoDatabase });
        logger.info("Create PositionsStateDetector and set listeners");


        const bot = new Telegram({telegram_bot_token:dotEnvObj.TELEGRAM_BOT_TOKEN,requestDelay:5000});
        logger.info("Create Telegram signals bot");

        positionsStateDetector.onNewPosition(async (position,trader)=>{
            try{
                // Loop through all users and send eeach a trade detected alert
                const users_Cursor = await mongoDatabase.collection.usersCollection.getAllDocumentsBy({status:true});
                while(await users_Cursor.hasNext()){
                    const user = await users_Cursor.next();
                    // If trader is being copied by user: Useer has a suub account dedicated to the trader
                    if(user){
                        const traderSubAccount = await mongoDatabase.collection.subAccountsCollection.findOne({
                            trader_uid: trader.uid,
                            testnet: user.testnet,
                            tg_user_id: user.tg_user_id
                        });
                        if(traderSubAccount){
                            await sendNewTradeDetectedMessage_toUser({
                                bot,
                                position_direction:position.direction,
                                position_entry_price: position.entry_price,
                                position_leverage:position.leverage,
                                position_pair: position.pair,
                                chatId: user.tg_user_id,
                                trader_username: trader.username
                            });

                        }else {
                            console.log("User:"+user.username+" has no subaccount for trader:"+trader.username);
                        }
    
                    }
                }

            }catch(error){
                logger.error(`${APP_NAME}:: Error: ${error.message}`);
            }
        });


        positionsStateDetector.onPositionClose(async (position,trader)=>{
            try{
                // Loop through all users and send eeach a trade detected alert
                const users_Cursor = await mongoDatabase.collection.usersCollection.getAllDocumentsBy({status:true});
                while(await users_Cursor.hasNext()){
                    const user = await users_Cursor.next();
                    // If trader is being copied by user: Useer has a suub account dedicated to the trader
                    if(user){
                        const traderSubAccount = await mongoDatabase.collection.subAccountsCollection.findOne({
                            trader_uid: trader.uid,
                            testnet: user.testnet,
                            tg_user_id: user.tg_user_id
                        });
                        if(traderSubAccount){
                            await sendTradeFullClosedDetectedMessage_toUser({
                                bot,
                                position_direction:position.direction,
                                position_entry_price: position.entry_price,
                                position_leverage:position.leverage,
                                position_pair: position.pair,
                                chatId: user.tg_user_id,
                                trader_username: trader.username,
                                position_roi: position.roi,
                                position_pnl: position.pnl
                            });

                        }
    
                    }
                }

            }catch(error){
                logger.error(`${APP_NAME}:: Error: ${error.message}`);
            }
        });

        positionsStateDetector.onPositionResize(async (originalPosition,closedPartPosition,trader)=>{
            try{
                // Loop through all users and send eeach a trade detected alert
                const users_Cursor = await mongoDatabase.collection.usersCollection.getAllDocumentsBy({status:true});
                while(await users_Cursor.hasNext()){
                    const user = await users_Cursor.next();
                    // If trader is being copied by user: Useer has a suub account dedicated to the trader
                    if(user){
                        const traderSubAccount = await mongoDatabase.collection.subAccountsCollection.findOne({
                            trader_uid: trader.uid,
                            testnet: user.testnet,
                            tg_user_id: user.tg_user_id
                        });
                        if(traderSubAccount){
                            await sendTradePartialClosedDetectedMessage_toUser({
                                bot,
                                position_direction:originalPosition.direction,
                                position_entry_price: originalPosition.entry_price,
                                position_leverage:originalPosition.leverage,
                                position_pair: originalPosition.pair,
                                chatId: user.tg_user_id,
                                trader_username: trader.username,
                                change_by: -(closedPartPosition.size),
                                change_by_percentage:0,
                                position_roi:closedPartPosition.roi,
                                position_pnl: closedPartPosition.pnl
                            });

                        }
    
                    }
                }

            }catch(error){
                logger.error(`${APP_NAME}:: Error: ${error.message}`);
            }
        });

        positionsStateDetector.onUpdatePosition(async (previousPositionDocument,position,trader)=>{
            try{
                // Loop through all users and send eeach a trade detected alert
                const users_Cursor = await mongoDatabase.collection.usersCollection.getAllDocumentsBy({status:true});
                while(await users_Cursor.hasNext()){
                    const user = await users_Cursor.next();
                    // If trader is being copied by user: Useer has a suub account dedicated to the trader
                    if(user){
                        const traderSubAccount = await mongoDatabase.collection.subAccountsCollection.findOne({
                            trader_uid: trader.uid,
                            testnet: user.testnet,
                            tg_user_id: user.tg_user_id
                        });
                        if(traderSubAccount){
                            // What changed
                            if(previousPositionDocument.size!==position.size){
                                // size changed
                                await sendTradeSizeUpdateDetectedMessage_toUser({
                                    bot,
                                    position_direction:position.direction,
                                    position_entry_price: position.entry_price,
                                    position_leverage:position.leverage,
                                    position_pair: position.pair,
                                    chatId: user.tg_user_id,
                                    trader_username: trader.username,
                                    change_by: (previousPositionDocument.size-position.size),
                                    change_percentage:0,
                                    // position_roi:position.roi,
                                    // position_pnl: position.pnl
                                });
                            }

                            if(previousPositionDocument.leverage!==position.leverage){
                                // leverage changed
                                await sendTradeLeverageUpdateDetectedMessage_toUser({
                                    bot,
                                    position_direction:position.direction,
                                    position_entry_price: position.entry_price,
                                    position_leverage:position.leverage,
                                    position_pair: position.pair,
                                    chatId: user.tg_user_id,
                                    trader_username: trader.username,
                                    change_by: (previousPositionDocument.leverage-position.leverage),
                                    change_percentage:0,

                                    // position_roi:position.roi,
                                    // position_pnl: position.pnl
                                });
                            }


                        }
    
                    }
                }

            }catch(error){
                logger.error(`${APP_NAME}:: Error: ${error.message}`);
            }
        });

        positionsStateDetector.listenToOpenTradesCollection();
        console.log("Listener: positionsStateDetector.listenToOpenTradesCollection() set");
        positionsStateDetector.listenToOldTradesCollection();
        console.log("Listener: positionsStateDetector.listenToOldTradesCollection() set");

    }catch(error){
        if(mongoDatabase){
            await mongoDatabase.disconnect();
        }
        error.message = `${APP_NAME} ${error.message}`;
        logger.error(error.message);
        
    }
})();
