// import { Performance, Traded } from '../a_connect/mongoModel.js'; // Import User model
const {MongoDatabase} = require("../../MongoDatabase");


const {Logger} = require("../../Logger");
const {Telegram} = require("../../Telegram");
const {readAndConfigureDotEnv} = require("../../Utils/readAndConfigureDotEnv");
const {sleepAsync} = require("../../Utils/sleepAsync");

const {calculatePerf} = require("./calculatePerf");

const APP_NAME = "App:Performance";
const logger = new Logger({app_name:APP_NAME});
const {IS_LIVE} = require("../../appConfig");
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE);
process.env.TZ = dotEnvObj.TZ;

console.log({dotEnvObj});


(async()=>{
    /**
     * @type {MongoDatabase|null}
     */ 
    let mongoDatabase = null;
    try{
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
         * Connect to DB
         */
        logger.info("Connecting to DB...s");
        mongoDatabase = new MongoDatabase(dotEnvObj.DATABASE_URI);
        await mongoDatabase.connect(dotEnvObj.DATABASE_NAME);
        logger.info("Connected to DB");

        /**
         * App
         */
        const run = true;
        while(run){
            logger.info("Calculating performance");
            await calculatePerf({mongoDatabase});
            logger.info("Finished Calculating performance");
            // Wait for 12 hours (12 * 60 * 60 * 1000 milliseconds) before executing again
            await sleepAsync(12 * 60 * 60 * 1000);
        }

    }catch(error){
        if(mongoDatabase){
            await mongoDatabase.disconnect();
        }
        logger.error(JSON.stringify(error.message));
        await sleepAsync(5000);
        throw error;
    }

})();


