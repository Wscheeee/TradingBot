//API_AdminDashboard
/**
 * Hosts the API for the admin dashboard.
 */


const {MongoDatabase} = require("../../MongoDatabase");
const {Bybit} = require("../../Trader");
const {Telegram} = require("../../Telegram");
const {Logger} = require("../../Logger");
const { readAndConfigureDotEnv } = require("../../Utils/readAndConfigureDotEnv");
const {IS_LIVE,TZ} = require("../../appConfig");


// Locals
const {routes} = require("./routes");

process.env.TZ = TZ;

const APP_NAME = "App:API_AdminDashboard";
const logger = new Logger({app_name:APP_NAME});

const dotEnvObj = readAndConfigureDotEnv(IS_LIVE);

/**
 * @param {import("http").IncomingMessage} res
 */

function getTheBodyAsync(res){
    return new Promise((resolve,reject)=>{
        let data ="";
        res.on("data",(chunk)=>{
            data += chunk;
        });
        res.on("end",()=>{
            console.log({data});
            resolve(JSON.parse(data));
        });
        res.on("error",(error)=>{
            reject(error);
        });
    });
}







(async()=>{
    /**
     * @type {MongoDatabase|null}
     */ 
    let mongoDatabase = null;
    try{
        logger.info("Start App");
        // Connect to DB
        /***
		 * Error Telegram bot for sendding error messages to Telegram error channel.
		 */
        const errorbot = new Telegram({telegram_bot_token:dotEnvObj.TELEGRAM_BOT_TOKEN,requestDelay:2000});
        logger.info("Create Telegrambot");
        logger.addLogCallback("error",async (cbIndex,message)=>{
            // FILTER OUT SOME MESSAGES
            const messagesToFilterOut= [
            ];
            const messageIsUnwanted = messagesToFilterOut.filter((filterText)=>{
                if(!message.includes(filterText)){
                    return filterText;
 
                }
            });
            if(!messageIsUnwanted){
                await errorbot.sendMessage(dotEnvObj.TELEGRAM_ERROR_CHHANNEL_ID,message);
 
            }
                 
            logger.info("Send error message to telegram error channel");
        });
 
 
 
        logger.info("Create Bybit Client");
       
        console.log(dotEnvObj);
        mongoDatabase = new MongoDatabase(dotEnvObj.DATABASE_URI);
        logger.info("Create DB");
        await mongoDatabase.connect(dotEnvObj.DATABASE_NAME);
        logger.info("Connect DB");


        // The app
        await routes({
            port: process.env.PORT || 30003,
            mongoDatabase,
            Bybit
        });


    }catch(error){
        console.log(error);
    }
})();







