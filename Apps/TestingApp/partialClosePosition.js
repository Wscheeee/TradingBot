//partialClosePosition.js
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
// const {Bybit} = require("../../Trader");

const {sleepAsync} = require("../../Utils/sleepAsync");
const { readAndConfigureDotEnv } = require("../../Utils/readAndConfigureDotEnv");
const {Logger} = require("../../Logger");
const {Telegram} = require("../../Telegram");

// local

 
const APP_NAME = "App:Executor"; 
const logger = new Logger({app_name:APP_NAME});
const {IS_LIVE} = require("../../appConfig");
const { calculatePnlFromPosition } = require("../ScrapeFollowedTradersPositions/calculatePnlFromPosition");
const { calculateRoiFromPosition } = require("../ScrapeFollowedTradersPositions/calculateRoiFromPosition");
const { DecimalMath } = require("../../Math/DecimalMath");
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE);
process.env.TZ = dotEnvObj.TZ;


(async () => {
    /**
     * @type {MongoDatabase|null}
     */ 
    let mongoDatabase = new MongoDatabase(dotEnvObj.DATABASE_URI);
    try {
        
        logger.info("Start "+APP_NAME);
        /***
		 * Error Telegram bot for sendding error messages to Telegram error channel.
		 */
        const errorbot = new Telegram({telegram_bot_token:dotEnvObj.TELEGRAM_BOT_TOKEN});
        logger.info("Create Telegrambot");
        logger.addLogCallback("error",async (cbIndex,message)=>{
            // FILTER OUT SOME MESSAGES
            const messagesToFilterOut= [
                "leverage not modified",
                "Isolated not modified",
                "position mode not modified"
            ];
            const messageIsUnwanted = messagesToFilterOut.filter((filterText)=>{
                if(message.includes(filterText)){
                    return filterText;

                } 
            });
            if(messageIsUnwanted.length===0){
                await errorbot.sendMessage(dotEnvObj.TELEGRAM_ERROR_CHHANNEL_ID,message);

            }
                
            logger.info("Send error message to telegram error channel");
        });

        const userMessagingBot = new Telegram({telegram_bot_token:dotEnvObj.TELEGRAM_BOT_TOKEN});
        logger.info("Create Telegram user messaging bot");


        logger.info("Create Bybit Client");
      
        console.log(dotEnvObj);
        
        logger.info("Create DB");
        await mongoDatabase.connect(dotEnvObj.DATABASE_NAME);
        logger.info("Connect DB");


        // const savedPosition_ = require("./position.json");
        const position_ = require("./traderUpdatedPosition.json");
        const savedPosition_ = require("./position_toDelete.json");
        const trader = require("./trader.json");
        // Creatte position in open_trades colelction
        let currentPositionsTotalParts = savedPosition_.part;
        if(true){
            console.log({
                "savedPosition_.size":savedPosition_.size,
                "position_.size":position_.size

            });
            if(savedPosition_.size > position_.size){// A partial was closed
                currentPositionsTotalParts = savedPosition_.total_parts+1;
                // means that a partial position was closed
                const partialPositionsSize = new DecimalMath(Math.abs(savedPosition_.size)).subtract(Math.abs(position_.size)).getResult();
                const roi = calculateRoiFromPosition({
                    close_price: savedPosition_.mark_price,
                    entry_price: savedPosition_.entry_price,
                    leverage: savedPosition_.leverage,
                    direction: savedPosition_.direction

                });
                const rrers = await mongoDatabase.collection.oldTradesCollection.createNewDocument({
                    original_position_id: mongoDatabase.createObjectIdFromString(savedPosition_._id),
                    close_datetime: new Date(),
                    direction:savedPosition_.direction,
                    entry_price: savedPosition_.entry_price,
                    close_price: savedPosition_.mark_price,
                    followed: savedPosition_.followed,
                    copied: savedPosition_.copied,
                    leverage: savedPosition_.leverage,
                    mark_price: savedPosition_.mark_price,
                    open_datetime: new Date(),
                    original_size: savedPosition_.original_size,
                    pair:savedPosition_.pair,
                    part: savedPosition_.total_parts,
                    pnl: calculatePnlFromPosition({
                        roi: roi,
                        entry_price: savedPosition_.entry_price,
                        size: partialPositionsSize,
                        leverage: savedPosition_.leverage
                    }),
                    roi: roi,
                    size: partialPositionsSize,
                    previous_size_before_partial_close: savedPosition_.size,
                    status: "CLOSED",
                    total_parts: currentPositionsTotalParts,
                    trader_id: mongoDatabase.createObjectIdFromString(savedPosition_.trader_id),
                    trader_uid: savedPosition_.trader_uid,
                    trader_username:savedPosition_.trader_username,
                    trader_today_estimated_balance: savedPosition_.trader_today_estimated_balance,
                    reason:"TRADER_CLOSED_THIS_POSITION",
                    document_created_at_datetime: new Date(),
                    document_last_edited_at_datetime: new Date(),
                    //@ts-ignore
                    server_timezone: process.env.TZ
                });
                console.log({rrers});
                const currentOpenPositionNewSize = new DecimalMath(savedPosition_.size).subtract(new DecimalMath(savedPosition_.size).subtract(position_.size).getResult()).getResult();
                // adjust the open position to partial closed
                await mongoDatabase.collection.openTradesCollection.updateDocument(mongoDatabase.createObjectIdFromString(savedPosition_._id),{
                    size: currentOpenPositionNewSize,
                    previous_size_before_partial_close: savedPosition_.size,
                    document_last_edited_at_datetime: new Date(),
                    total_parts: currentPositionsTotalParts,

                });
            }else if(savedPosition_.size < position_.size){// The size was increased
                // so update the position 
                await mongoDatabase.collection.openTradesCollection.updateDocument(mongoDatabase.createObjectIdFromString(savedPosition_._id),{
                    size: position_.size,
                    previous_size_before_partial_close: position_.size,
                });
                    
            }else { // size did not change
                console.log("Size did not change");
            }

            // Check for leverage change
            if(savedPosition_.leverage!=position_.leverage){
                // update leverage incase of change
                await mongoDatabase.collection.openTradesCollection.updateDocument(mongoDatabase.createObjectIdFromString(savedPosition_._id),{
                    leverage: savedPosition_.leverage,
                });
            }

            // Update other details

            await mongoDatabase.collection.openTradesCollection.updateDocument(mongoDatabase.createObjectIdFromString(savedPosition_._id),{
                mark_price: position_.mark_price,
                document_last_edited_at_datetime: new Date(),
                server_timezone: process.env.TZ
            });

        }// End of isPositionRunning

        // if(savedPosition_.size<position_.amount){
        // means that a size was added :: might happen even when position is not running
        // update even if nothing changed
        // so update the position 
        await mongoDatabase.collection.openTradesCollection.updateDocument(mongoDatabase.createObjectIdFromString(savedPosition_._id),{
            trader_id: savedPosition_.trader_id,
            trader_uid: savedPosition_.trader_uid,
            // close_datetime: null,
            direction: savedPosition_.direction,
            entry_price: position_.entry_price,
            followed: savedPosition_.followed,
            copied: savedPosition_.copied,
            leverage: savedPosition_.leverage,
            mark_price: position_.mark_price,
            open_datetime: savedPosition_.open_datetime,
            original_size: savedPosition_.original_size<position_.size?position_.server_timezone:savedPosition_.original_size, // Adjust original size incase of size increase
            pair: savedPosition_.pair,
            part: savedPosition_.part,
            size: position_.size,
            previous_size_before_partial_close: (position_.size!=savedPosition_.size?position_.size:savedPosition_.previous_size_before_partial_close),
            status: savedPosition_.status,
            total_parts: currentPositionsTotalParts,
            document_created_at_datetime: savedPosition_.document_created_at_datetime,
            document_last_edited_at_datetime: new Date(),
            server_timezone: process.env.TZ
        });
         
        
      
    }catch(error){
        if(mongoDatabase){
            await mongoDatabase.disconnect();
        }
        logger.error(JSON.stringify(error.message));
        await sleepAsync(5000);
        // throw error;
    }  
})();
