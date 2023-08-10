//partialClosePosition.js
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
const { DecimalMath } = require("../../Math/DecimalMath");
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


       
        
      
    }catch(error){
        if(mongoDatabase){
            await mongoDatabase.disconnect();
        }
        logger.error(JSON.stringify(error.message));
        await sleepAsync(5000);
        // throw error;
    }  
})();
