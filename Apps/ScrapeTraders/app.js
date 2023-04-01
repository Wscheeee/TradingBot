/**
 * Scrape traders once per day and save/update in db;
 */

const {BinanceScraper,createPuppeteerBrowser} = require("../../Binance_Scraper");
const {MongoDatabase} = require("../../MongoDatabase");
const {sleepAsync} = require("../../Utils/sleepAsync");
const {readAndConfigureDotEnv} = require("../../Utils/readAndConfigureDotEnv");
const {leaderboardTradersAndStatsHandler} = require("./leaderboardTradersAndStatsHandler");
const {makeDifferentLeaderboardSearchQueries} = require("./makeDifferentLeaderboardSearchQueries");

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
    while(true){
        const TODAY_DAY_NUMBER = new Date().getDay();
        const if3HoursPassed = new IfHoursPassed(3);
        if3HoursPassed.start();
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
                const page = await browser.newPage()
                page.setDefaultNavigationTimeout(0);
                /**
                 * 1. Get traders and their info
                 */
                const binance = new BinanceScraper({
                    browser,isLive:IS_LIVE,
                    delayPerRequestInMs:5000
                });
                await binance.openLeaderboardFuturesPage(page);
                binance.setGlobalPage(page)

                
                /**
                 * Scrape traders 
                 */
                const possibleSearchQueries = makeDifferentLeaderboardSearchQueries();
                for(const searchQuery of possibleSearchQueries){
                    await leaderboardTradersAndStatsHandler({binance,mongoDatabase},searchQuery);
                
                };


                await browser.close()
                await mongoDatabase.disconnect();
                lastScrapedDayNumber = TODAY_DAY_NUMBER;
                await sleepAsync(5000)
            }catch(e){
                if(browser){
                    await browser.close()
                }
                if(mongoDatabase){
                    await mongoDatabase.disconnect();
                }
                console.log(e);
                
            }


        }   
        const min30 = (1000*60)*30;
        await sleepAsync(min30)         
    }
})()