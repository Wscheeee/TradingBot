"use-strict";
//@ts-check
/**
 * Scrape traders once per day and save/update in db;
 */

const {BinanceScraper,createPuppeteerBrowser} = require("../../Binance_Scraper");
const {MongoDatabase} = require("../../MongoDatabase");
const {sleepAsync} = require("../../Utils/sleepAsync");
const {readAndConfigureDotEnv} = require("../../Utils/readAndConfigureDotEnv");

const IS_LIVE = false;
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE); 
const {Telegram} = require("../../Telegram");
const {Logger} = require("../../Logger");
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
            let mongoDatabase = null;
            let browser = null;
            try{
                /**
                 * 0. Create db and Create a browser 
                 */
                mongoDatabase = new MongoDatabase(process.env.DATABASE_URI);
                await mongoDatabase.connect(process.env.DATABASE_NAME);
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
                const savedTraderCursor = await mongoDatabase.collection.topTradersCollection.getAllDocuments();
                while(await savedTraderCursor.hasNext()){
                    const savedTrader = await savedTraderCursor.next();

                    // Get the trader's performance and update on DB
                    const traderPerformance = await binance.getOtherPerformance(page,{encryptedUid:savedTrader.uid,tradeType:"PERPETUAL"});
 
            
                    await mongoDatabase.collection.topTradersCollection.updateDocument(savedTrader._id,{
                        username: savedTrader.username,
                        uid: savedTrader.uid,
                        copied: savedTrader.copied,
                        followed: savedTrader.followed,
                        weight:1,
                        updatedOn:Date.now(),
                        allPNL: 
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"ALL",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.allPNL
                                ),
                        allROI: 
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"ALL",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.allROI
                                ),
                        dailyPNL: 
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"DAILY",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.dailyPNL
                                ),
                        dailyROI: 
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"DAILY",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.dailyROI
                                ),
                        weeklyPNL:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"WEEKLY",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.weeklyPNL
                                ),
                        weeklyROI:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"WEEKLY",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.weeklyROI
                                ),
                        monthlyPNL:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"MONTHLY",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.monthlyPNL
                                ),
                        monthlyROI:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"MONTHLY",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.monthlyROI
                                ),
                        yearlyPNL:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"YEARLY",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.yearlyPNL
                                ),
                        yearlyROI:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"YEARLY",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.yearlyROI
                                ),
                        // exacts
                        exactWeeklyPNL:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"EXACT_WEEKLY",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.exactWeeklyPNL
                                ),
                        exactWeeklyROI:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"EXACT_WEEKLY",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.exactWeeklyROI
                                ),
                        exactMonthlyPNL:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"EXACT_MONTHLY",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.exactMonthlyPNL
                                ),
                        exactMonthlyROI:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"EXACT_MONTHLY",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.exactMonthlyROI
                                ),
                        exactYearlyPNL:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"EXACT_YEARLY",
                                        statisticsType:"PNL"
                                    },
                                    savedTrader.exactYearlyPNL
                                ),
                        exactYearlyROI:
                            binance.
                                utils.
                                traderPerformance.
                                getValueForPerformance(
                                    traderPerformance,
                                    {
                                        periodType:"EXACT_YEARLY",
                                        statisticsType:"ROI"
                                    },
                                    savedTrader.exactYearlyROI
                                ),
                    });

                }

                await browser.close();
                await mongoDatabase.disconnect();
                lastScrapedDayNumber = TODAY_DAY_NUMBER;
                await sleepAsync(5000);
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