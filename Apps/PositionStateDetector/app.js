const {BinanceScraper,createPuppeteerBrowser} = require("../../Binance_Scraper");
const {MongoDatabase} = require("../../MongoDatabase");
const {sleepAsync} = require("../../Utils/sleepAsync");
const {Telegram} = require("../../Telegram/Telegram")
const {readAndConfigureDotEnv} = require("../../Utils/readAndConfigureDotEnv");

const {PositionsStateDetector} = require("./PositionStateDetector");
const IS_LIVE = true;
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE); 


process.env.TZ = dotEnvObj.TZ;
process.env.DATABASE_URI = dotEnvObj.DATABASE_URI;
process.env.DATABASE_NAME = dotEnvObj.DATABASE_NAME;
console.log(process.env);

/**
 * 
 * @param {{traderName:string, pair:string, leverage:string, quantity:string, direction:string}} param0 
 * @returns 
 */


(async()=>{
    let mongoDatabase = null;
    let browser = null;
    try{
        const telegram = new Telegram({chat_id:1,requestDelay:2000});
        /**
         * 0 Connect to DB
         */
        mongoDatabase = new MongoDatabase(process.env.DATABASE_URI);
        await mongoDatabase.connect(process.env.DATABASE_NAME);
        const positionsStateDetector = new PositionsStateDetector({mongoDatabase:mongoDatabase});
        

        positionsStateDetector.onNewPosition(async (position,trader)=>{
            console.log("New position added")
            const msg = `New Position:${trader.username}: 
            pair:${position.pair} 
            direction:${position.direction} 
            size:${position.size} 
            part:${position.part}`;
            const {direction,leverage,pair,quantity,traderName} = {
                leverage: position.leverage,
                pair: position.pair,
                quantity: position.size,
                traderName: trader.username,
                direction: position.direction 
            }

            await telegram.sendMessage(msg);
        })

        positionsStateDetector.onPositionResize((originalPosition,partPosition,trader)=>{
            console.log("Position resized")
            const msg = `Position Resize:${trader.username}: 
            pair:${partPosition.pair} 
            direction:${partPosition.direction} 
            size:${partPosition.size} 
            part:${position.part}`;
            telegram.sendMessage(msg);
            console.log(msg)
        })

        positionsStateDetector.onPositionClose((position,trader)=>{
            console.log("Close position")
            const msg = `Close Position:${trader.username}: 
            pair:${position.pair} 
            direction:${position.direction} 
            size:${position.size} 
            part:${position.part}`;
            telegram.sendMessage(msg);
            console.log(msg)
        })



        // Set Listeners
        positionsStateDetector.listenToOpenTradesCollection();
        positionsStateDetector.listenToOldTradesCollection();
        

        
    }catch(error){
        throw error;
    }
})();