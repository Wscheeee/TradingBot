//@ts-check


/***
 * Runs calculations to estimate trader's balance 
 * 
 * Runs when a trader's pnl is updated
 */




const { MongoDatabase , TopTradersCollectionStateDetector} = require("../../MongoDatabase");

const {sleepAsync} = require("../../Utils/sleepAsync");
const { readAndConfigureDotEnv } = require("../../Utils/readAndConfigureDotEnv");
const {Logger} = require("../../Logger");
const {Telegram} = require("../../Telegram");


// local
// const {estimateTotalTraderBalance} = require("./estimateTotalTraderBalance");
const {saveTraderEstimatedTotalDayBalance} = require("./saveTraderEstimatedTotalDayBalance");
// const {saveTraderEstimatedTotalCurrentBalance} = require("./saveTraderEstimatedTotalCurrentBalance");


const APP_NAME = "App:EstimatedTraderBalanceCalc";
const logger = new Logger({app_name:APP_NAME});
const {IS_LIVE} = require("../../appConfig");
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE);
process.env.TZ = dotEnvObj.TZ;





(async () => {
    /**
     * @type {MongoDatabase|null}
     */ 
    let mongoDatabase = null;
    let interval = null;
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



        logger.info("Create Bybit Client");
      
        console.log(dotEnvObj);
        mongoDatabase = new MongoDatabase(dotEnvObj.DATABASE_URI);
        if(!mongoDatabase)throw new Error("Error creating mongoDatabase");
        logger.info("Create DB");
        await mongoDatabase.connect(dotEnvObj.DATABASE_NAME);
        logger.info("Connect DB");

        //////////////////////////////////
        // TOP TRADERS COLLECTION
        const topTradersCollectionStateDetector = new TopTradersCollectionStateDetector({ mongoDatabase: mongoDatabase ,arrayOfUpdateFilters:["daily_pnl","daily_roi"]});
        logger.info("Create topTradersCollectionStateDetector and set listeners");
        topTradersCollectionStateDetector.onUpdateDocument(async (topTraderDocumentBeforeUpdate,topTraderDocumentAfterUpdate)=>{
            try{
                logger.info(`topTraders.onUpdateDocument b4:${JSON.stringify(topTraderDocumentBeforeUpdate)}${JSON.stringify(topTraderDocumentAfterUpdate)}`);
                if(!mongoDatabase)return;

                const estimatedTotalBalance = await mongoDatabase.collection.topTradersCollection.utils.estimateTotalTraderBalance({
                    mongoDatabase,
                    traderDocument:topTraderDocumentAfterUpdate
                });

                await saveTraderEstimatedTotalDayBalance({
                    estimated_total_balance:estimatedTotalBalance,
                    mongoDatabase,
                    traderDocument: topTraderDocumentAfterUpdate
                });
                
              
            }catch(e){
                logger.error(`topTraders.onCreateDocument ${e.message}`);
            }
        });
       

        topTradersCollectionStateDetector.listenToTopTradersCollectionCollection();
        logger.info("Set topTradersCollectionStateDetector.listenToTopTradersCollectionCollection");
        //////////////////////////////////


        ////////////////////////////////
        // POSITIONS COLECTION




      
    }catch(error){
        if(interval){
            clearInterval(interval);
        }
        if(mongoDatabase){
            await mongoDatabase.disconnect();
        }
        logger.error(JSON.stringify(error.message));
        await sleepAsync(5000);
        // throw error;
    }  
})();