const {BinanceScraper,createPuppeteerBrowser} = require("../../Binance_Scraper");
const {MongoDatabase} = require("../../MongoDatabase");
const {sleepAsync} = require("../../Utils/sleepAsync");
const {positionsHandler} = require("./positionsHandler");
const {readAndConfigureDotEnv} = require("../../Utils/readAndConfigureDotEnv");
const IS_LIVE = false;
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE); 
process.env.TZ = dotEnvObj.TZ;
process.env.DATABASE_URI = dotEnvObj.DATABASE_URI;
process.env.DATABASE_NAME = dotEnvObj.DATABASE_NAME;
console.log(process.env);
(async ()=>{
    while(true){
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
                browser,isLive:IS_LIVE,delayPerRequestInMs:1000
            });
            binance.setGlobalPage(page);
            await binance.openLeaderboardFuturesPage(page);
            // get traders from db that have followed key set to true

            //::## WORK ON POSITIONS
            await positionsHandler({binanceScraper:binance,mongoDatabase:mongoDatabase})

            await browser.close()
            await mongoDatabase.disconnect();
            // await sleepAsync(5000)
        }catch(e){
            if(browser){
                await browser.close()
            }
            if(mongoDatabase){
                await mongoDatabase.disconnect();
            }
            await sleepAsync((1000*60))
            console.log(e);
            
        }

        
    }
})()