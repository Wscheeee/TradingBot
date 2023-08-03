// traderCloseFullPosition.js
//@ts-check
/***
 * EXECUTOR STEPS
 * =================
 * GOAL: Place trades on user's account
 * CRITERIAS:
 * : Account balance is not less than minimum needed.
 * : 
 */





/**
 * Login to an exchange and place trades;
 */

const { MongoDatabase , PositionsStateDetector} = require("../../MongoDatabase");
// const {Bybit} = require("../../Trader");

const {sleepAsync} = require("../../Utils/sleepAsync");
const { readAndConfigureDotEnv } = require("../../Utils/readAndConfigureDotEnv");
const {Logger} = require("../../Logger");
const {Telegram} = require("../../Telegram");

// local

 
const APP_NAME = "App:Executor"; 
const logger = new Logger({app_name:APP_NAME});
const {IS_LIVE} = require("../../appConfig");
const { calculatePnlFromPosition } = require("../ScrapeFollowedTradersPositions/calculatePnlFromPosition");
const { calculateRoiFromPosition } = require("../ScrapeFollowedTradersPositions/calculateRoiFromPosition");
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE);
process.env.TZ = dotEnvObj.TZ;


(async () => {
    /**
     * @type {MongoDatabase|null}
     */ 
    let mongoDatabase = new MongoDatabase(dotEnvObj.DATABASE_URI);
    try {
        
        logger.info("Start "+APP_NAME);
        /***
		 * Error Telegram bot for sendding error messages to Telegram error channel.
		 */
        const errorbot = new Telegram({telegram_bot_token:dotEnvObj.TELEGRAM_BOT_TOKEN});
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

        const userMessagingBot = new Telegram({telegram_bot_token:dotEnvObj.TELEGRAM_BOT_TOKEN});
        logger.info("Create Telegram user messaging bot");


        logger.info("Create Bybit Client");
      
        console.log(dotEnvObj);
        
        logger.info("Create DB");
        await mongoDatabase.connect(dotEnvObj.DATABASE_NAME);
        logger.info("Connect DB");


        const positionToClose_ = require("./traderUpdatedPosition.json");
        const trader = require("./trader.json");
        // Creatte position in open_trades colelction
        const datetimeNow = new Date();
        const roi = calculateRoiFromPosition({
            close_price: positionToClose_.mark_price,
            entry_price: positionToClose_.entry_price,
            leverage: positionToClose_.leverage,
            direction: positionToClose_.direction
        });
        await mongoDatabase.collection.oldTradesCollection.createNewDocument({
            original_position_id: mongoDatabase.createObjectIdFromString(positionToClose_._id),
            close_datetime: new Date(),
            direction:positionToClose_.direction,
            entry_price: positionToClose_.entry_price,
            close_price: positionToClose_.mark_price, 
            followed: positionToClose_.followed,
            copied: positionToClose_.copied,
            leverage: positionToClose_.leverage, 
            mark_price: positionToClose_.mark_price,
            open_datetime: datetimeNow,
            original_size: positionToClose_.original_size,
            pair:positionToClose_.pair,
            part: positionToClose_.part,
            pnl: calculatePnlFromPosition({
                roi: roi,
                entry_price: positionToClose_.entry_price,
                size: positionToClose_.size,
                leverage: positionToClose_.leverage
            }),
            roi: roi,
            size: positionToClose_.size,
            previous_size_before_partial_close: positionToClose_.previous_size_before_partial_close,
            status: "CLOSED",
            total_parts: positionToClose_.total_parts,
            trader_id: mongoDatabase.createObjectIdFromString(positionToClose_.trader_id),
            trader_uid: positionToClose_.trader_uid ,
            trader_username: positionToClose_.trader_username,
            trader_today_estimated_balance: positionToClose_.trader_today_estimated_balance,
            document_created_at_datetime: datetimeNow,
            document_last_edited_at_datetime: datetimeNow,
            server_timezone: process.env.TZ||"",
            reason: "TRADER_CLOSED_THIS_POSITION"
        });
        // delete from openPositions collections
        await mongoDatabase.collection.openTradesCollection.deleteManyDocumentsByIds([positionToClose_._id]);
         
        
      
    }catch(error){
        if(mongoDatabase){
            await mongoDatabase.disconnect();
        }
        logger.error(JSON.stringify(error.message));
        await sleepAsync(5000);
        // throw error;
    }  
})();
