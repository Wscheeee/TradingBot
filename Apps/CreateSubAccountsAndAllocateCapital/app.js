//@ts-check
/***
 * APP :
 * -------
 * Runs 
 * :-when configs change
 * :-When new user is created
 * :- At a certain time
 * : 
 */



const { MongoDatabase , SubAccountsConfigCollectionStateDetector,UsersCollectionStateDetector} = require("../../MongoDatabase");

const {sleepAsync} = require("../../Utils/sleepAsync");
const { readAndConfigureDotEnv } = require("../../Utils/readAndConfigureDotEnv");
const {Logger} = require("../../Logger");
const {Telegram} = require("../../Telegram");

// local
const {createSubAccountsAndAllocateCapital_forAllUsers_InParalell} = require("./createSubAccountsAndAllocateCapital_forAllUsers_InParalell");

const APP_NAME = "App:CreateSubAccountsAndAllocateCapital";
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
        // SUB ACCOUNTS CONFIG COLLECTION
        const subAccountsConfigCollectionStateDetector = new SubAccountsConfigCollectionStateDetector({ mongoDatabase: mongoDatabase });
        logger.info("Create SubAccountsConfigCollectionStateDetector and set listeners");
        subAccountsConfigCollectionStateDetector.onCreateDocument(async (configDocument)=>{
            logger.info(`subAcccountConfig.onCreateDocument ${configDocument.sub_link_name}`);
            if(!mongoDatabase)return;
            await createSubAccountsAndAllocateCapital_forAllUsers_InParalell({
                mongoDatabase,
                onError: (error)=>{
                    logger.error(error.message);
                }
            });
        });
        subAccountsConfigCollectionStateDetector.onUpdateDocument(async (configDocument)=>{
            logger.info(`subAcccountConfig.onUpdateDocument ${configDocument.sub_link_name}`);
            if(!mongoDatabase)return;
            await createSubAccountsAndAllocateCapital_forAllUsers_InParalell({
                mongoDatabase,
                onError: (error)=>{
                    logger.error(error.message);
                }
            });
        });

        
        subAccountsConfigCollectionStateDetector.listenToSubAccountsConfigCollection();
        logger.info("Set subAccountsConfigCollectionStateDetector.listenToSubAccountsConfigCollection");
        //////////////////////////////////


        //////////////////////////////////
        // USERS COLLECTION
        const usersCollectionStateDetector = new UsersCollectionStateDetector({ mongoDatabase: mongoDatabase });
        logger.info("Create UsersCollectionStateDetector and set listeners");
        usersCollectionStateDetector.onCreateDocument(async (user)=>{
            logger.info(`user.onCreateDocument ${user.tg_user_id}`);
            if(!mongoDatabase)return;
            await createSubAccountsAndAllocateCapital_forAllUsers_InParalell({
                mongoDatabase,
                onError: (error)=>{
                    logger.error(error.message);
                }
            });
        });
        usersCollectionStateDetector.onUpdateDocument(async (user)=>{
            logger.info(`user.onUpdateDocument ${user.tg_user_id}`);
            if(!mongoDatabase)return;
            await createSubAccountsAndAllocateCapital_forAllUsers_InParalell({
                mongoDatabase,
                onError: (error)=>{
                    logger.error(error.message);
                }
            });
        });

        
        usersCollectionStateDetector.listenToUsersCollection();
        logger.info("usersCollectionStateDetector.listenToUsersCollection");
        //////////////////////////////////


        //////////////////////////////////
        // RUN AT A PARTICULAR TIME
        let previousDayRun = -1;
        interval = setInterval(async()=>{
            const now = new Date();
            const now_localTimeString = now.toLocaleTimeString("en-US", { hour12: false });
            const [now_hours, now_minutes, now_seconds] = now_localTimeString.split(":").map(s=>Number(s));
            console.log({now_hours, now_minutes, now_seconds});

            if (now_hours==2 && previousDayRun!== now.getDay()) {
                console.log("(=>Run At 2am)");
                if(!mongoDatabase)return;
                await createSubAccountsAndAllocateCapital_forAllUsers_InParalell({
                    mongoDatabase,
                    onError: (error)=>{
                        logger.error(error.message);
                    }
                });
                // If the target time has already passed, schedule the task for the next day
                previousDayRun = new Date().getDay();

            }
        },1000);
        
      

        //////////////////////////////////
      
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
