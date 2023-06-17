// ================================================
const { MongoDatabase , PositionsStateDetector} = require("../../MongoDatabase");
const { sleepAsync } = require("../../Utils/sleepAsync");
const {Telegram} = require("../../Telegram");
const {Logger} = require("../../Logger");
const {DecimalMath} = require("../../DecimalMath");
const { readAndConfigureDotEnv } = require("../../Utils/readAndConfigureDotEnv");


const {IS_LIVE} = require("../../appConfig");
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE);
const APP_NAME = "App:SendSignalsToTelegram";
const logger = new Logger({app_name:APP_NAME});


process.env.TZ = dotEnvObj.TZ;
process.env.DATABASE_URI = dotEnvObj.DATABASE_URI;
process.env.DATABASE_NAME = dotEnvObj.DATABASE_NAME;
console.log(process.env);

(async () => {
    let mongoDatabase = null;
    try {
        const bot = new Telegram({telegram_bot_token:dotEnvObj.TELEGRAM_BOT_TOKEN,requestDelay:5000});
        logger.info("Create Telegram signals bot");
        const errorbot = new Telegram({telegram_bot_token:dotEnvObj.TELEGRAM_BOT_TOKEN,requestDelay:2000});
        logger.info("Create Telegram error bot");
        logger.addLogCallback("error",async (cbIndex,message)=>{
            await errorbot.sendMessage(dotEnvObj.TELEGRAM_ERROR_CHHANNEL_ID,message);
            logger.info("Send error message to telegram error channel");
        });
        mongoDatabase = new MongoDatabase(process.env.DATABASE_URI);
        await mongoDatabase.connect(process.env.DATABASE_NAME);
        const positionsStateDetector = new PositionsStateDetector({ mongoDatabase: mongoDatabase });

        positionsStateDetector.onNewPosition(async (position, trader) => {
            console.log("New position added");
            bot.sendMessage("@AtomosTradingSignals",
                `✅ New Position ✅

👨🏽‍💻 Trader : ${"Anonymous"}
💰 Pair : ${position.pair}
🔖 Type : ${position.direction}
🌿 Leverage : ${position.leverage}
⌛ Entry Price : ${new DecimalMath(position.entry_price).truncateToDecimalPlaces(5).getResult()}`
            );
        }); 
 
        positionsStateDetector.onUpdatePosition(async (previousPosition,position,trader) => {
            console.log("positionsStateDetector.onUpdatePosition");
            console.log({previousPosition});
            if(!previousPosition){
                console.log("Previous Position not passed in.");
                return;
            }else {
                console.log("Previous Position passed");
            }
            if(previousPosition.size>position.size){
                console.log("previousPosition.size>position.size: It''s a resize");
                return;// Its a resize
            }else {
                console.log("Pass");
            }
            if(position.size<position.previous_size_before_partial_close){
                console.log("position.size<position.previous_size_before_partial_close: It''s a resize");
                return;// Its a resize
            }else {
                console.log("Pass");
            }
            console.log("Position updated"); 
            if(previousPosition.size<position.size){
                console.log("previousPosition.size<position.size");
                // size increased
                let sizeChange = new DecimalMath(position.size).subtract(position.previous_size_before_partial_close).getResult();
                if(sizeChange===0)return;
                if (sizeChange >= 0) {
                    sizeChange = "+" + sizeChange; }
    
                if(Number.isNaN(sizeChange)){
                    logger.error(`Size change is :${sizeChange} \n ${{"position.size":position.size, "position.original_size":position.previous_size_before_partial_close }}`);
                }
                bot.sendMessage("@AtomosTradingSignals",`✴️ Position Updated ✴️

👨🏽‍💻 Trader : ${"Anonymous"}
💰 Pair : ${position.pair}
🔖 Type : ${position.direction}
🌿 Leverage : ${position.leverage}
⌛ Entry Price : ${new DecimalMath(position.entry_price).truncateToDecimalPlaces(5).getResult()}
❇️ Size Change of : ${sizeChange}

✨ Size : ${position.previous_size_before_partial_close} ➡️ ${position.size} ✨`
);
            }

            if(previousPosition.leverage!==position.leverage){
                // leverage addjusted
                let leverageChange = new DecimalMath(position.leverage).subtract(previousPosition.leverage).getResult();
                if(leverageChange===0)return;
                if (leverageChange >= 0) {
                    leverageChange = "+" + leverageChange; }
    
                if(Number.isNaN(leverageChange)){
                    logger.error(`Leverage change is :${leverageChange} \n ${{"previousPosition.leverage":previousPosition.leverage, "position.leverage":position.leverage }}`);
                }
                bot.sendMessage("@AtomosTradingSignals",`✴️ Position Updated ✴️

👨🏽‍💻 Trader : ${"Anonymous"}
💰 Pair : ${position.pair}
🔖 Type : ${position.direction}
🌿 Leverage :  ${previousPosition.leverage} ➡️ ${position.leverage} ✨
⌛ Entry Price : ${new DecimalMath(position.entry_price).truncateToDecimalPlaces(5).getResult()}
❇️ Leverage Change of : ${leverageChange}

✨ Size : ${position.size}`
);

            }
        });

        positionsStateDetector.onPositionResize(async (originalPosition, position,trader) => {
            console.log("Close position");
            console.log({originalPosition, position,trader});
            let roi = (position.roi * 100).toFixed(2); 
            bot.sendMessage("@AtomosTradingSignals",
                `🛑 Partial Position Closed 🛑

👨🏽‍💻 Trader : ${"Anonymous"}
💰 Pair : ${position.pair}
🔖 Type : ${position.direction}
🌿 Leverage : ${position.leverage}
💸 Position Size : ${position.previous_size_before_partial_close}
💸 Closed Size : ${position.size}
💸 Left Size : ${position.previous_size_before_partial_close-position.size}
⌛ Entry Price : ${new DecimalMath(position.entry_price).truncateToDecimalPlaces(5).getResult()}
⌛ Closed Price : ${new DecimalMath(position.mark_price).truncateToDecimalPlaces(5).getResult()}

📈💶🚀 ROI : ${roi}% 🚀💶📈`
            );
        });
        
        positionsStateDetector.onPositionClose(async (position, trader) => {
            console.log("Close position");
            let roi = (position.roi * 100).toFixed(2);
            bot.sendMessage("@AtomosTradingSignals",
                `🛑 Position Closed 🛑

👨🏽‍💻 Trader : ${"Anonymous"}
💰 Pair : ${position.pair}
🔖 Type : ${position.direction}
🌿 Leverage : ${position.leverage}
💸 Size : ${position.size}
⌛ Entry Price : ${new DecimalMath(position.entry_price).truncateToDecimalPlaces(5).getResult()}
⌛ Closed Price : ${new DecimalMath(position.mark_price).truncateToDecimalPlaces(5).getResult()}

📈💶🚀 ROI : ${roi}% 🚀💶📈`
            );
        });

        positionsStateDetector.listenToOpenTradesCollection();
        positionsStateDetector.listenToOldTradesCollection();

    } catch (error) {
        if(mongoDatabase){
            await mongoDatabase.disconnect();
        }
        const newErrorMessage = `${error.message}`;
        error.message = newErrorMessage;
        logger.error(error.message);
        await sleepAsync(5000);
        throw error;
    }
})();