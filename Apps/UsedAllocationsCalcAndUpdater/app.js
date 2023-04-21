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

const { MongoDatabase , TradedPositionsStateDetector} = require("../../MongoDatabase");

const {sleepAsync} = require("../../Utils/sleepAsync");
const { readAndConfigureDotEnv } = require("../../Utils/readAndConfigureDotEnv");
const {Logger} = require("../../Logger");
const {Telegram} = require("../../Telegram");

// local

 
const APP_NAME = "App:UsedAllocationsCalcAndUpdater";
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

        
      
        console.log(dotEnvObj);
        /**
		 * Connect to db.
		 */
        mongoDatabase = new MongoDatabase(dotEnvObj.DATABASE_URI);
        logger.info("Create DB");
        await mongoDatabase.connect(dotEnvObj.DATABASE_NAME);
        logger.info("Connect DB");
        const tradedPositionsStateDetector = new TradedPositionsStateDetector({ mongoDatabase: mongoDatabase });
        logger.info("Create tradedPositionsStateDetector and set listeners");


        

        tradedPositionsStateDetector.onNewPosition(async (tradedPosition,trader)=>{
            try{
                if(!tradedPosition)throw new Error("(tradedPositionsStateDetector.onNewPosition) tradedPosition is null");
                if(!trader)throw new Error("(tradedPositionsStateDetector.onNewPosition) trader is null");
    
                const tatalUsedBalance = await calculateTotalUsedBalanceForATrader(trader.uid);
                const trader_allocated_balance_value = trader.trader_base_allocation;
                // To calculate the Used Allocation:
                // const used_allocation = total_used_balance / trader_allocated_balance_value
                const 
            }catch(error){
                console.log({error});
                let errorMsg = "(fn:newTradedPositionHandler) "+ (error && error.message?error.message:"");
                errorMsg+=" ("+tradedPosition.pair+")";
                logger.error(JSON.stringify(errorMsg));
            }

        });
        tradedPositionsStateDetector.onCloseTradedPosition_Partial((trradedPosition_Full, tradedPosition_Partial,trader)=>{

        });
        tradedPositionsStateDetector.onCloseTradedPosition_Full((closedTradedPosition,trader)=>{

        });

        tradedPositionsStateDetector.listenToTradedPositionsCollection();
        logger.info("Set tradedPositionsStateDetector.listenToTradedPositionsCollection");

     
      
    }catch(error){
        if(mongoDatabase){
            await mongoDatabase.disconnect();
        }
        logger.error(JSON.stringify(error.message));
        await sleepAsync(5000);
        // throw error;
    }  
})();
