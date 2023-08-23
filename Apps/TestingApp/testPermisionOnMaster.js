//@ts-check
/***
 * EXECUTOR STEPS
 * =================
 * GOAL: Place trades on user's account
 * CRITERIAS:
 * : Account balance is not less than minimum needed.
 * : 
 */





/**
 * Login to an exchange and place trades;
 */

const { MongoDatabase ,} = require("../../MongoDatabase");
const {Bybit} = require("../../Trader");

const {sleepAsync} = require("../../Utils/sleepAsync");
const { readAndConfigureDotEnv } = require("../../Utils/readAndConfigureDotEnv");
// const {Logger} = require("../../Logger");
// const {Telegram} = require("../../Telegram");

// local
const fs = require("fs");

 
const APP_NAME = "App:TestingPermissonOnMasters"; 
// const logger = new Logger({app_name:APP_NAME});
const {IS_LIVE} = require("../../appConfig");
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE);
process.env.TZ = dotEnvObj.TZ;


(async () => {
    // let mongoDatabase = new MongoDatabase(dotEnvObj.DATABASE_URI);
    try {
        const bybit = new Bybit({
            millisecondsToDelayBetweenRequests:0,
            privateKey:"Rwm4Lo5tFNLFjtEJsGwA2Au8ethu61cHbDWQ",
            publicKey:"H4ooZx0U4pYE21V0PQ",
            testnet:true
        });


        // get master account balance
        const balance = await bybit.clients.bybit_RestClientV5.getUSDTDerivativesAccountWalletBalance()
        console.log({balance});

        
      
    }catch(error){
        // if(mongoDatabase){
        //     await mongoDatabase.disconnect();
        // }
        // logger.error(JSON.stringify(error.message));
        await sleepAsync(5000);
        throw error;
    }  
})();
