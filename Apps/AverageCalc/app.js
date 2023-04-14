"use-strict";
//@ts-check
/**
 * CALCULATES averageConcurrentTrade+averageTradeSize_Calc
 */

const {MongoDatabase} = require("../../MongoDatabase");
const {sleepAsync} = require("../../Utils/sleepAsync");
const {readAndConfigureDotEnv} = require("../../Utils/readAndConfigureDotEnv");

const {IS_LIVE} = require("../../appConfig");
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE); 
const {Telegram} = require("../../Telegram");
const {Logger} = require("../../Logger");
const {IfHoursPassed} = require("../../Utils/IfHoursPassed");
const APP_NAME = "App:AverageCalc";
const logger = new Logger({app_name:APP_NAME});

process.env.TZ = dotEnvObj.TZ;
process.env.DATABASE_URI = dotEnvObj.DATABASE_URI;
process.env.DATABASE_NAME = dotEnvObj.DATABASE_NAME;
console.log(process.env);
console.log(IS_LIVE);
(async ()=>{
    /**
     * @type {number}
     */
    let lastScrapedDayNumber = -1;
    const errorbot = new Telegram({telegram_bot_token:dotEnvObj.TELEGRAM_BOT_TOKEN,requestDelay:2000});
    logger.info("Create Telegram Error bot");
    logger.addLogCallback("error",async (cbIndex,message)=>{
        await errorbot.sendMessage(dotEnvObj.TELEGRAM_ERROR_CHHANNEL_ID,message);
        logger.info("Send error message to telegram error channel");
    });
    let run = true;
    while(run){
        const TODAY_DAY_NUMBER = new Date().getDay();
        while(lastScrapedDayNumber!==TODAY_DAY_NUMBER){// Scrape when day changes
            /**
             * @type {MongoDatabase|null}
             */
            let mongoDatabase = null;
            try{
                /**
                 * 0. Create db 
                 */
                mongoDatabase = new MongoDatabase(process.env.DATABASE_URI);
                await mongoDatabase.connect(process.env.DATABASE_NAME);

                

                /***
                 * 3. Get the traders on the DB and get their performances and update
                 */
                const savedTraderCursor = await mongoDatabase.collection.topTradersCollection.getAllDocumentsBy({followed:true});
                while(await savedTraderCursor.hasNext()){
                    const savedTrader = await savedTraderCursor.next();
                    const TIMESTAMP_NOW = Date.now();
                    
                    if(
                        savedTrader.averages_uptade_timestamp && 
                        IfHoursPassed.from(savedTrader.averages_last_uptade_timestamp).to(TIMESTAMP_NOW).hours(24) ==false
                    ){
                        continue;
                    }
                    // Get the trader's all closed trades and perform calculations to get averageConcurrentTrade and averageTradeSize_Calc
                    const tradersOldTrades_Cursor = await mongoDatabase.collection.oldTradesCollection.getAllDocumentsBy({trader_uid:savedTrader.uid});
                    const endDate_ms = Date.now(); // today
                    const ONE_DAY_IN_MS = ((1000*60)*60)*24;
                    const startDate_ms = endDate_ms-(ONE_DAY_IN_MS*7);// 7 days ago
                    const endDate = new Date(endDate_ms);
                    const startDate = new Date(startDate_ms);
                    const {average_concurrent_trades,average_trade_count_value} = await mongoDatabase.collection.oldTradesCollection.utils.calculateTradeAverages_ByCursor(tradersOldTrades_Cursor,startDate,endDate);

                    await mongoDatabase.collection.topTradersCollection.updateDocument(savedTrader._id,{
                        average_concurrent_trades,
                        average_trade_count_value,
                        averages_last_uptade_datetime:new Date(),
                    });

                }
                await mongoDatabase.disconnect();
                lastScrapedDayNumber = TODAY_DAY_NUMBER;
                await sleepAsync(5000);
            }catch(error){
                if(mongoDatabase){
                    await mongoDatabase.disconnect();
                }
                logger.error(JSON.stringify(error.message));
                
            }


        }   
        const min30 = (1000*60)*30;
        await sleepAsync(min30);     
    }
})();

