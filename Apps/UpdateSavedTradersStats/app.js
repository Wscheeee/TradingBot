//@ts-check
"use-strict";

/**
 * Scrape traders once per day and save/update in db;
 * NOTE: Runs once at 4:am
 */

const {BinanceScraper,createPuppeteerBrowser} = require("../../Binance_Scraper");
const {MongoDatabase} = require("../../MongoDatabase");
const {sleepAsync} = require("../../Utils/sleepAsync");
const {readAndConfigureDotEnv} = require("../../Utils/readAndConfigureDotEnv");

// local
const {saveTraderEstimatedTotalTodayBalance} = require("./saveTraderEstimatedTotalTodayBalance");

const {IS_LIVE} = require("../../appConfig");
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE); 
const {Telegram} = require("../../Telegram");
const {Logger} = require("../../Logger");
const { DateTime } = require("../../DateTime");
const APP_NAME = "App:UpdateSavedTradersStats";
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
    // let lastScrapedHourNumber = -1;
    const errorbot = new Telegram({telegram_bot_token:dotEnvObj.TELEGRAM_BOT_TOKEN });
    logger.info("Create Telegram Error bot");
    logger.addLogCallback("error",async (cbIndex,message)=>{
        await errorbot.sendMessage(dotEnvObj.TELEGRAM_ERROR_CHHANNEL_ID,message);
        logger.info("Send error message to telegram error channel");
    });
    let run = true;
    while(run){
        // Run once at 2:05:am
        const dateTimeNow = new DateTime().now();
        const CURRENT_HOUR = dateTimeNow.hours;
        const TODAY_DAY_NUMBER = dateTimeNow.day_index;
        const CURRENT_MINUTE = dateTimeNow.minutes;
        // while(true){// Scrape immediitately
        while(lastScrapedDayNumber!==TODAY_DAY_NUMBER && CURRENT_HOUR===2 && CURRENT_MINUTE>30){// Scrape when day changes
            logger.error("RUNNING: "+APP_NAME);
            let mongoDatabase = null;
            let browser = null; 
            try{ 
                /**
                 * 0. Create db and Create a browser 
                 */
                mongoDatabase = new MongoDatabase(dotEnvObj.DATABASE_URI);
                await mongoDatabase.connect(dotEnvObj.DATABASE_NAME);
                browser = await createPuppeteerBrowser({
                    IS_LIVE,
                    browserRevisionToDownload:"901912",
                    devtools: true,
                    headless:true,
                    downloadBrowserRevision: false
                });
                const page = await browser.newPage();
                page.setDefaultNavigationTimeout(0);
                /**
                 * 1. Get traders and their info
                 */
                const binance = new BinanceScraper({
                    browser,isLive:IS_LIVE,
                    delayPerRequestInMs:5000
                });
                await binance.openLeaderboardFuturesPage(page);
                binance.setGlobalPage(page);

                

                /***
                 * 3. Get the traders on the DB and get their performances and update
                 */

                //Update the followed traders first
                const folllowedSavedTraderCursor = await mongoDatabase.collection.topTradersCollection.getAllDocumentsBy({
                    followed:true
                });
                while(await folllowedSavedTraderCursor.hasNext()){
                    await sleepAsync(5000);// Delay betwween each traderr
                    const savedTrader = await folllowedSavedTraderCursor.next();
                    if(!savedTrader)continue;

                    // Get the trader's performance and update on DB
                    const traderPerformance = await binance.getOtherPerformance(page,{encryptedUid:savedTrader.uid,tradeType:"PERPETUAL"});
 
            
                    await mongoDatabase.collection.topTradersCollection.updateDocument(savedTrader._id,{
                        username: savedTrader.username,
                        uid: savedTrader.uid,
                        followed: savedTrader.followed,
                        yesterday_estimated_balance: savedTrader.today_estimated_balance,
                        past_day_pnl:savedTrader.daily_pnl===0?savedTrader.past_day_pnl:savedTrader.daily_pnl,
                        past_day_roi:savedTrader.daily_roi===0?savedTrader.past_day_roi:savedTrader.daily_roi,  
                        document_last_edited_at_datetime: new Date(),
                        performances_last_uptade_datetime: new Date(),
                        all_pnl: 
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"ALL",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.all_pnl
                                ),
                        all_roi: 
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"ALL",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.all_roi
                                ),
                        daily_pnl: 
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"DAILY",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.daily_pnl
                                ),
                        daily_roi: 
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"DAILY",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.daily_roi
                                ),
                        weekly_pnl:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"WEEKLY",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.weekly_pnl
                                ),
                        weekly_roi:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"WEEKLY",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.weekly_roi
                                ),
                        monthly_pnl:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"MONTHLY",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.monthly_pnl
                                ),
                        monthly_roi:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"MONTHLY",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.monthly_roi
                                ),
                        yearly_pnl:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"YEARLY",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.yearly_pnl
                                ),
                        yearly_roi:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"YEARLY",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.yearly_roi
                                ),
                        // exacts
                        exact_weekly_pnl:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"EXACT_WEEKLY",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.exact_weekly_pnl
                                ),
                        exact_weekly_roi:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"EXACT_WEEKLY",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.exact_weekly_roi
                                ),
                        exact_monthly_pnl:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"EXACT_MONTHLY",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.exact_monthly_pnl
                                ),
                        exact_monthly_roi:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"EXACT_MONTHLY",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.exact_monthly_roi
                                ),
                        exact_yearly_pnl:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"EXACT_YEARLY",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.exact_yearly_pnl
                                ),
                        exact_yearly_roi:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"EXACT_YEARLY",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.exact_yearly_roi
                                ),
                    });

                    const updatedTraderDoc = await mongoDatabase.collection.topTradersCollection.findOne({_id:savedTrader._id});

                    if(!updatedTraderDoc){
                        logger.error("updatedTraderDoc not found for trader: "+savedTrader.username);
                        continue;
                    }

                    // Perform the estimate trader's balance calculation
                    const estimateBalance = await mongoDatabase.collection.topTradersCollection.utils.estimateTotalTraderBalance({
                        mongoDatabase,
                        traderDocument: updatedTraderDoc
                    });
                    if (estimateBalance===0){

                        await saveTraderEstimatedTotalTodayBalance({
                            mongoDatabase,
                            traderDocument: updatedTraderDoc,
                            estimated_total_balance: savedTrader.today_estimated_balance||0
                        });

                    } else {

                        await saveTraderEstimatedTotalTodayBalance({
                            mongoDatabase,
                            traderDocument: updatedTraderDoc,
                            estimated_total_balance: estimateBalance
                        });
                    }
                }


                // Update all other traders
                const savedTraderCursor = await mongoDatabase.collection.topTradersCollection.getAllDocumentsBy({
                    followed:false
                });
                while(await savedTraderCursor.hasNext()){
                    const savedTrader = await savedTraderCursor.next();
                    if(!savedTrader)continue;

                    // Get the trader's performance and update on DB
                    const traderPerformance = await binance.getOtherPerformance(page,{encryptedUid:savedTrader.uid,tradeType:"PERPETUAL"});
 
            
                    await mongoDatabase.collection.topTradersCollection.updateDocument(savedTrader._id,{
                        username: savedTrader.username,
                        uid: savedTrader.uid,
                        followed: savedTrader.followed,
                        yesterday_estimated_balance: savedTrader.today_estimated_balance,
                        past_day_pnl:savedTrader.daily_pnl===0?savedTrader.past_day_pnl:savedTrader.daily_pnl,
                        past_day_roi:savedTrader.daily_roi===0?savedTrader.past_day_roi:savedTrader.daily_roi,  
                        document_last_edited_at_datetime: new Date(),
                        performances_last_uptade_datetime: new Date(),
                        all_pnl: 
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"ALL",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.all_pnl
                                ),
                        all_roi: 
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"ALL",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.all_roi
                                ),
                        daily_pnl: 
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"DAILY",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.daily_pnl
                                ),
                        daily_roi: 
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"DAILY",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.daily_roi
                                ),
                        weekly_pnl:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"WEEKLY",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.weekly_pnl
                                ),
                        weekly_roi:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"WEEKLY",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.weekly_roi
                                ),
                        monthly_pnl:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"MONTHLY",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.monthly_pnl
                                ),
                        monthly_roi:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"MONTHLY",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.monthly_roi
                                ),
                        yearly_pnl:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"YEARLY",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.yearly_pnl
                                ),
                        yearly_roi:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"YEARLY",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.yearly_roi
                                ),
                        // exacts
                        exact_weekly_pnl:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"EXACT_WEEKLY",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.exact_weekly_pnl
                                ),
                        exact_weekly_roi:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"EXACT_WEEKLY",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.exact_weekly_roi
                                ),
                        exact_monthly_pnl:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"EXACT_MONTHLY",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.exact_monthly_pnl
                                ),
                        exact_monthly_roi:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"EXACT_MONTHLY",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.exact_monthly_roi
                                ),
                        exact_yearly_pnl:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"EXACT_YEARLY",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.exact_yearly_pnl
                                ),
                        exact_yearly_roi:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"EXACT_YEARLY",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.exact_yearly_roi
                                ),
                    }); 

                    const updatedTraderDoc = await mongoDatabase.collection.topTradersCollection.findOne({_id:savedTrader._id});

                    if(!updatedTraderDoc){
                        logger.error("updatedTraderDoc not found for trader: "+savedTrader.username);
                        continue;
                    }
                    // Perform the estimate trader's balance calculation
                    const estimateBalance = await mongoDatabase.collection.topTradersCollection.utils.estimateTotalTraderBalance({
                        mongoDatabase,
                        traderDocument: updatedTraderDoc
                    });
                    await saveTraderEstimatedTotalTodayBalance({
                        mongoDatabase,
                        traderDocument: updatedTraderDoc,
                        estimated_total_balance: estimateBalance
                    });

                }

                await browser.close();
                await mongoDatabase.disconnect();
                // lastScrapedHourNumber = CURRENT_HOUR;
                lastScrapedDayNumber=TODAY_DAY_NUMBER;
                
                await sleepAsync(1000);
            }catch(error){
                if(browser){
                    await browser.close();
                }
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