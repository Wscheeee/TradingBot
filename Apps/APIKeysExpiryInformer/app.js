//@ts-check
/***
 * Get users from DB and then for each user ccheck the expiry date of the Master API keys.
 * : 
 */





/**
 * Login to an exchange and place trades;
 */

const { MongoDatabase } = require("../../MongoDatabase");
const {Bybit} = require("../../Trader");

const {sleepAsync} = require("../../Utils/sleepAsync");
const { readAndConfigureDotEnv } = require("../../Utils/readAndConfigureDotEnv");
const {Logger} = require("../../Logger");
const {Telegram} = require("../../Telegram");

// local

 
const APP_NAME = "App:APIKeysExpiryInformer"; 
const logger = new Logger({app_name:APP_NAME});
const {IS_LIVE} = require("../../appConfig");
const { DateTime } = require("../../DateTime");
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE);
process.env.TZ = dotEnvObj.TZ;


(async () => {
    // /**
    //  * @type {MongoDatabase}
    //  */ 
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

        // Runs oonce a day
        /** 
         * @type {number}
         */
        let lastScrapedDayNumber = -1;
        setTimeout(async ()=>{
            // Run once at 2:05:am
            const dateTimeNow = new DateTime().now();
            const TODAY_DAY_NUMBER = dateTimeNow.day_index;
            if(lastScrapedDayNumber != TODAY_DAY_NUMBER ){// Scrape when day changes
            // while(lastScrapedDayNumber!==TODAY_DAY_NUMBER && CURRENT_HOUR===2 && CURRENT_MINUTE>30){// Scrape when day changes
                logger.error("RUNNING "+APP_NAME);
                try{
                    const users_Cursor = await mongoDatabase.collection.usersCollection.getAllDocumentsBy({
                        status:true
                    });
                    const users = await users_Cursor.toArray();
                    // Loop through all users and query about their APII kes expiry
                    for(const user of users){
                        try{
                            const bybit = new Bybit({
                                millisecondsToDelayBetweenRequests: 7000,
                                privateKey: user.privateKey,
                                publicKey: user.publicKey,
                                testnet: user.testnet===false?false:true
                            });
                            const apiKeyInfo_Res = await bybit.clients.bybit_RestClientV5.getAPIKeyInformation();
                            // console.log({apiKeyInfo_Res});
                            //@ts-ignore
                            if(apiKeyInfo_Res.retCode!==0)throw new Error("apiKeyInfo_Res:"+apiKeyInfo_Res.retMsg);
        
                            const createdAt = apiKeyInfo_Res.result.createdAt;
                            const expiringAt = apiKeyInfo_Res.result.expiredAt;
                            console.log({
                                createdAt,
                                expiringAt
                            });
                            if(!expiringAt)continue;
                            const timeDelta_inMs = new Date(expiringAt).getTime() - new Date(createdAt).getTime();
                            const SEVEN_DAYS_IN_MS = (((((1000)*60)*60)*24) *7);
                            const EXPIRATIION_CRITICAL = SEVEN_DAYS_IN_MS>timeDelta_inMs;
                            if(EXPIRATIION_CRITICAL){// less than 7 days remaining
                                await userMessagingBot.sendMessage(user.chatId, "⚠️ Warning : Your API is almost expired please update it on Bybit or contact @AzmaFr");
                            }

                        }catch(error){
                            await userMessagingBot.sendMessage(user.chatId,error.message);
                            logger.error(JSON.stringify(error.message));
                            // throw error;
                        }
                    }
    
                    lastScrapedDayNumber = TODAY_DAY_NUMBER;
                    
                    // await sleepAsync(1000);
                }catch(error){
                    error.message = `${error.message}`;
                    logger.error(JSON.stringify(error.message));
                    
                }
    
    
            }      

        },(1000*60)*60);
        
      
    }catch(error){
        if(mongoDatabase){
            await mongoDatabase.disconnect();
        }
        logger.error(JSON.stringify(error.message));
        await sleepAsync(5000);
        // throw error;
    }  
})();
