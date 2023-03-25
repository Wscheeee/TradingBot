const {BinanceScraper,createPuppeteerBrowser} = require("../../Binance_Scraper");
const {MongoDatabase} = require("../../MongoDatabase");
const {sleepAsync} = require("../../Utils/sleepAsync");
const {positionsHandler} = require("./positionsHandler");
const {readAndConfigureDotEnv} = require("../../Utils/readAndConfigureDotEnv");

const {PositionsStateDetector} = require("./PositionStateDetector");
const dotEnvObj = readAndConfigureDotEnv(); 

process.env.TZ = dotEnvObj.TZ;
process.env.DATABASE_URI = dotEnvObj.DATABASE_URI;
process.env.DATABASE_NAME = dotEnvObj.DATABASE_NAME;
console.log(process.env);
const IS_LIVE = false;


(async()=>{
    let mongoDatabase = null;
    let browser = null;
    try{
        /**
         * 0 Connect to DB
         */
        mongoDatabase = new MongoDatabase(process.env.DATABASE_URI);
        await mongoDatabase.connect(process.env.DATABASE_NAME);
        const positionsStateDetector = new PositionsStateDetector({mongoDatabase:mongoDatabase});
        positionsStateDetector.listenToOpenTradesCollection();
        positionsStateDetector.listenToOldTradesCollection();

        
    }catch(error){
        throw error;
    }
})();