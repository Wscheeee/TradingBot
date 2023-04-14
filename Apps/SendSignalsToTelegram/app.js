// ================================================
const { MongoDatabase , PositionsStateDetector} = require("../../MongoDatabase");
const { sleepAsync } = require("../../Utils/sleepAsync");
const {Telegram} = require("../../Telegram");
const {Logger} = require("../../Logger");

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
⌛ Entry Price : ${position.entry_price}`
            );
        });

        //         positionsStateDetector.onUpdatePosition(async (position, trader) => {
        //             console.log("Position updated");
        //             let sizeChange = position.size - position.original_size;
        //             if (sizeChange >= 0) {
        //                 sizeChange = "+" + sizeChange; }

        //             if(Number.isNaN(sizeChange)){
        //                 logger.error(`Size change is :${sizeChange} \n ${{"position.size":position.size, "position.original_size":position.original_size }}`);
        //             }
        //             bot.sendMessage("@AtomosTradingSignals",
        //                 `✴️ Position Updated ✴️

        // 👨🏽‍💻 Trader : ${"Anonymous"}
        // 💰 Pair : ${position.pair}
        // 🔖 Type : ${position.direction}
        // 🌿 Leverage : ${position.leverage}
        // ⌛ Entry Price : ${position.entry_price}
        // ❇️ Size Change of : ${sizeChange}

        // ✨ Size : ${position.original_size} ➡️ ${position.size} ✨`
        //             );
        //         });

        positionsStateDetector.onPositionResize(async (originalPosition, position,trader) => {
            console.log("Close position");
            let roi = (position.roi * 100).toFixed(2);
            bot.sendMessage("@AtomosTradingSignals",
                `🛑 Partial Position Closed 🛑

👨🏽‍💻 Trader : ${"Anonymous"}
💰 Pair : ${position.pair}
🔖 Type : ${position.direction}
🌿 Leverage : ${position.leverage}
💸 Position Size : ${originalPosition.size}
💸 Closed Size : ${position.size}
💸 Left Size : ${originalPosition.size-position.size}
⌛ Entry Price : ${position.entry_price}
⌛ Closed Price : ${position.mark_price}

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
⌛ Entry Price : ${position.entry_price}
⌛ Closed Price : ${position.mark_price}

📈💶🚀 ROI : ${roi}% 🚀💶📈`
            );
        });

        positionsStateDetector.listenToOpenTradesCollection();
        positionsStateDetector.listenToOldTradesCollection();

    } catch (error) {
        if(mongoDatabase){
            await mongoDatabase.disconnect();
        }
        logger.error(JSON.stringify(error.message));
        await sleepAsync(5000);
        throw error;
    }
})();