const {BinanceScraper,createPuppeteerBrowser} = require("../../Binance_Scraper");
const {MongoDatabase} = require("../../MongoDatabase");
const {sleepAsync} = require("../../Utils/sleepAsync");
const {positionsHandler} = require("./positionsHandler");
const {readAndConfigureDotEnv} = require("../../Utils/readAndConfigureDotEnv");
const {Telegram} = require("../../Telegram");
const {Logger} = require("../../Logger");
const APP_NAME = "App:ScrapeFollowedTradersPositions";
const logger = new Logger({app_name:APP_NAME});
const {IfHoursPassed} = require("../../Utils/IfHoursPassed");

const {IS_LIVE} = require("../../appConfig");
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE); 
process.env.TZ = dotEnvObj.TZ;
process.env.DATABASE_URI = dotEnvObj.DATABASE_URI;
process.env.DATABASE_NAME = dotEnvObj.DATABASE_NAME;
console.log(process.env);

 
(async ()=>{
    let mongoDatabase = null;
    let browser = null;
    let run = true;
    while(run){
        try{
            // const errorbot = new Telegram({telegram_bot_token:dotEnvObj.TELEGRAM_BOT_TOKEN,requestDelay:2000});
            // logger.info("Create Telegram error bot");
            // logger.addLogCallback("error",async (cbIndex,message)=>{
            //     await errorbot.sendMessage(dotEnvObj.TELEGRAM_ERROR_CHHANNEL_ID,message);
            //     logger.info("Send error message to telegram error channel");
            // });
            
            const if3HoursPassed = new IfHoursPassed(3);
            if3HoursPassed.start();
            // /**
            //  * 0. Create db and Create a browser 
            //  */
            // mongoDatabase = new MongoDatabase(process.env.DATABASE_URI);
            // await mongoDatabase.connect(process.env.DATABASE_NAME);
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
                browser,isLive:IS_LIVE,delayPerRequestInMs:1000
            });
            binance.setGlobalPage(page);
            await binance.openLeaderboardFuturesPage(page);
            // get traders from db that have followed key set to true

            //::## WORK ON POSITIONS
            await positionsHandler({binanceScraper:binance,mongoDatabase:mongoDatabase});

            await browser.close();
            await mongoDatabase.disconnect();
            await sleepAsync((1000*10));
            if(if3HoursPassed.isTrue()){
                process.exit();
            }
            
        }catch(error){
            if(browser){
                await browser.close();
            }
            if(mongoDatabase){
                await mongoDatabase.disconnect();
            }
            logger.error(JSON.stringify(error.message));
            await sleepAsync((1000*60));
            console.log(error);
            process.exit();
            
        }

        
    }
})();