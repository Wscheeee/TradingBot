/**
 * Scrape traders once per day and save/update in db;
 */

const {BinanceScraper,createPuppeteerBrowser} = require("../../Binance_Scraper");
const {MongoDatabase} = require("../../MongoDatabase");
const {sleepAsync} = require("../../Utils/sleepAsync");
const {readAndConfigureDotEnv} = require("../../Utils/readAndConfigureDotEnv");
const {leaderboardTradersAndStatsHandler} = require("./leaderboardTradersAndStatsHandler");
const {makeDifferentLeaderboardSearchQueries} = require("./makeDifferentLeaderboardSearchQueries");
const {Telegram} = require("../../Telegram");
const {Logger} = require("../../Logger");
const APP_NAME = "App:ScrapeTraders";
const logger = new Logger({app_name:APP_NAME});

const IS_LIVE = false;
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE); 


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

                
                /**
                 * Scrape traders 
                 */
                const possibleSearchQueries = makeDifferentLeaderboardSearchQueries();
                for(const searchQuery of possibleSearchQueries){
                    await leaderboardTradersAndStatsHandler({binance,mongoDatabase},searchQuery);
                
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
                console.log(error);
                logger.error(JSON.stringify(error.message));

                await sleepAsync((1000*60)*5);
                logger.info("Wait for 5 minutes");
            }


        }   
        
        const min30 = (1000*60)*30;
        await sleepAsync(min30);     
    }
})();