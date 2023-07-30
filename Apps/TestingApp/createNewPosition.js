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
const {newPositionHandler} = require("./newPositionHandler"); 
const {positionUpdateHandler} = require("./positionUpdateHandler"); 
const {positionResizeHandler} = require("./positionResizeHandler"); 
const {positionCloseHandler} = require("./positionCloseHandler"); 

 
const APP_NAME = "App:Executor"; 
const logger = new Logger({app_name:APP_NAME});
const {IS_LIVE} = require("../../appConfig");
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


        const position_ = require("./position.json");
        const trader = require("./trader.json");
        // Creatte position in open_trades colelction
        const datetimeNow = new Date();
        await mongoDatabase.collection.openTradesCollection.createNewDocument({
            trader_id: mongoDatabase.createObjectIdFromString(trader._id),
            trader_uid: trader.uid, 
            trader_username: trader.username,
            //@ts-ignore
            today_estimated_balance: position_.today_estimated_balance,
            direction: position_.direction,
            entry_price: position_.entry_price,
            followed: position_.followed,
            // copied: savedTraderDbDoc && savedTraderDbDoc.copied?true:false,
            copied: position_.copied,
            leverage: position_.leverage,
            mark_price: position_.mark_price,
            open_datetime: datetimeNow,
            original_size: position_.original_size,
            pair: position_.pair,
            part:0,
            size: position_.size,
            previous_size_before_partial_close: position_.previous_size_before_partial_close,
            status: position_.status,
            total_parts: 1,
            document_created_at_datetime: datetimeNow,
            document_last_edited_at_datetime: datetimeNow,
            server_timezone: process.env.TZ||""
        });
        
      
    }catch(error){
        if(mongoDatabase){
            await mongoDatabase.disconnect();
        }
        logger.error(JSON.stringify(error.message));
        await sleepAsync(5000);
        // throw error;
    }  
})();
