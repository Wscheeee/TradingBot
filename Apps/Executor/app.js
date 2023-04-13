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
const {Bybit} = require("../../Trader");

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
    let mongoDatabase = null;
    try {
        
        logger.info("Start App");
        /***
		 * Error Telegram bot for sendding error messages to Telegram error channel.
		 */
        const errorbot = new Telegram({telegram_bot_token:dotEnvObj.TELEGRAM_BOT_TOKEN,requestDelay:2000});
        logger.info("Create Telegrambot");
        logger.addLogCallback("error",async (cbIndex,message)=>{
            await errorbot.sendMessage(dotEnvObj.TELEGRAM_ERROR_CHHANNEL_ID,message);
            logger.info("Send error message to telegram error channel");
        });

        /**
		 * Connect to bybit.
		 */
        const bybit = new Bybit({
            millisecondsToDelayBetweenRequests: 5000,
            privateKey: dotEnvObj.BYBIT_PRIVATE_KEY,
            publicKey: dotEnvObj.BYBIT_PUBLIC_KEY,
            testnet: !dotEnvObj.BYBIT_ACCOUNT_IS_LIVE
        });

        logger.info("Create Bybit Client");
      
        console.log(dotEnvObj);
        mongoDatabase = new MongoDatabase(dotEnvObj.DATABASE_URI);
        logger.info("Create DB");
        await mongoDatabase.connect(dotEnvObj.DATABASE_NAME);
        logger.info("Connect DB");
        const positionsStateDetector = new PositionsStateDetector({ mongoDatabase: mongoDatabase });
        logger.info("Create PositionsStateDetector and set listeners");
        

        await newPositionHandler({
            bybit,
            logger,
            mongoDatabase,
            positionsStateDetector
        });
        await positionUpdateHandler({
            bybit,
            logger,
            mongoDatabase,
            positionsStateDetector
        });
        await positionResizeHandler({
            bybit,
            logger,
            mongoDatabase,
            positionsStateDetector
        });
        await positionCloseHandler({
            bybit,
            logger,
            mongoDatabase,
            positionsStateDetector,
        });

        

        

        

        positionsStateDetector.listenToOpenTradesCollection();
        logger.info("Set positionsStateDetector.listenToOpenTradesCollection");
        positionsStateDetector.listenToOldTradesCollection();
        logger.info("Set positionsStateDetector.listenToOldTradesCollection");
      
    }catch(error){
        if(mongoDatabase){
            await mongoDatabase.disconnect();
        }
        logger.error(JSON.stringify(error.message));
        await sleepAsync(5000);
        // throw error;
    }  
})();
