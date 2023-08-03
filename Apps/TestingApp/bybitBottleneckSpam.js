// traderCloseFullPosition.js
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

const { MongoDatabase , PositionsStateDetector} = require("../../MongoDatabase");
const {Bybit} = require("../../Trader");

// const {sleepAsync} = require("../../Utils/sleepAsync");
const { readAndConfigureDotEnv } = require("../../Utils/readAndConfigureDotEnv");
const {Logger} = require("../../Logger");
// const {Telegram} = require("../../Telegram");

// local

 
const APP_NAME = "App:bybitBottleneckSpam.js"; 
const logger = new Logger({app_name:APP_NAME});
const {IS_LIVE} = require("../../appConfig");
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE);
process.env.TZ = dotEnvObj.TZ;


(async () => {
    let mongoDatabase = new MongoDatabase(dotEnvObj.DATABASE_URI);
    try {
        await mongoDatabase.connect(dotEnvObj.DATABASE_NAME);
        const users_Cursor = await mongoDatabase.collection.usersCollection.getAllDocuments();
        const users = await users_Cursor.toArray();
        const user = users[0];
        
        let counter = 0;
        new Array(200).fill(0).forEach(async function(){
            counter+=1;
            console.log({counter});
            const userSubs_Cursor = await mongoDatabase.collection.subAccountsCollection.getAllDocumentsBy({
                testnet: user.testnet,
                tg_user_id:user.tg_user_id
            });
            const subs = await userSubs_Cursor.toArray(); 
            subs.forEach(async (sub)=>{
                if(sub){
                    const bybit = new Bybit({
                        millisecondsToDelayBetweenRequests: 0,
                        privateKey:sub.private_api,
                        publicKey:sub.public_api,
                        testnet:sub.testnet
                    });
                    const getActiveOrders_Res = await bybit.clients.bybit_RestClientV5.getActiveOrders({
                        category:"linear",
                        settleCoin:"USDT"
                    });
                    console.log({getActiveOrders_Res,counter});
                    if(getActiveOrders_Res.retCode!==0){
                        throw new Error(`counter: ${counter} getActiveOrders_Res: ${getActiveOrders_Res.retMsg}`);
                    }
    
                }
    
            });


        });
        
      
    }catch(error){
        
        logger.error(JSON.stringify(error.message));
        throw error;
    }  
})();
