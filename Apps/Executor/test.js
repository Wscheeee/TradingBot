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
            millisecondsToDelayBetweenRequests: 10000,
            privateKey: dotEnvObj.BYBIT_PRIVATE_KEY,
            publicKey: dotEnvObj.BYBIT_PUBLIC_KEY,
            testnet: !dotEnvObj.BYBIT_ACCOUNT_IS_LIVE
        });
        // await bybit.setUpWebsocketListeners();

        logger.info("Create Bybit Client");
      
        console.log(dotEnvObj);
        mongoDatabase = new MongoDatabase(dotEnvObj.DATABASE_URI);
        logger.info("Create DB");
        await mongoDatabase.connect(dotEnvObj.DATABASE_NAME);
        logger.info("Connect DB");
        const positionsStateDetector = new PositionsStateDetector({ mongoDatabase: mongoDatabase });
        logger.info("Create PositionsStateDetector and set listeners");


        const closePositionRes = await bybit.clients.bybit_RestClientV5.closeAPosition({
            category: "linear",
            orderType: "Market",
            qty: "5.5",
            side: "Sell",
            symbol: "SNXUSDT",
            positionIdx: 1
        });
        console.log({closePositionRes});


        logger.info("Get closed partial position info");
        // await sleepAsync(5000);
        const closedPartialPositionInfo_Res = await bybit.clients.bybit_RestClientV5.getClosedPositionInfo({
            category:"linear",
            orderId: closePositionRes.result.orderId,
            symbol: "SNXUSDT"
        });
        if(Object.keys(closedPartialPositionInfo_Res.result).length==0)throw new Error(closedPartialPositionInfo_Res.retMsg);
        // for(const closedPositiionInfoObj of closedPartialPositionInfo_Res.result.list){
        //     console.log({closedPositiionInfoObj});
        // }
        const closed_positionInfoInExchange =  closedPartialPositionInfo_Res.result.list.find((accountOrderV5)=>
            accountOrderV5.orderId=== closePositionRes.result.orderId
        );

        if(!closed_positionInfoInExchange){
            throw new Error("closedPartialPositionInfo_Res not found");
        }
        console.log({closed_positionInfoInExchange});

        const closedPartialPNL_res = await bybit.clients.bybit_RestClientV5.getClosedPositionPNL({
            category:"linear",
            symbol:"SNXUSDT",
        });

        
            
        if(!closedPartialPNL_res.result ||!closedPartialPNL_res.result.list[0]){
            logger.error("Position partial expected to be closed , it's close PNL not found.");
        }
        const closedPositionPNLObj = closedPartialPNL_res.result.list.find((closedPnlV5) => closedPnlV5.orderId===closePositionRes.result.orderId);

        if(!closedPositionPNLObj)throw new Error("closedPositionPNLObj not found for closed partial position:");
        console.log({closedPositionPNLObj});
        let closedPartialPNL  = parseFloat(closedPositionPNLObj.closedPnl);
        console.log({closedPartialPNL});



        return;
        
      
    }catch(error){
        if(mongoDatabase){
            await mongoDatabase.disconnect();
        }
        logger.error(JSON.stringify(error.message));
        await sleepAsync(5000);
        // throw error;
    }  
})();
