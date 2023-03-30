// ================================================
const { MongoDatabase , PositionsStateDetector} = require("../../MongoDatabase");
const { sleepAsync } = require("../../Utils/sleepAsync");
const {Telegram} = require("../../Telegram");

const { readAndConfigureDotEnv } = require("../../Utils/readAndConfigureDotEnv");


const IS_LIVE = true;
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE);

process.env.TZ = dotEnvObj.TZ;
process.env.DATABASE_URI = dotEnvObj.DATABASE_URI;
process.env.DATABASE_NAME = dotEnvObj.DATABASE_NAME;
console.log(process.env);

(async () => {
  let mongoDatabase = null;
  try {
    const bot = new Telegram({telegram_bot_token:dotEnvObj.TELEGRAM_BOT_TOKEN,requestDelay:5000});

    mongoDatabase = new MongoDatabase(process.env.DATABASE_URI);
    await mongoDatabase.connect(process.env.DATABASE_NAME);
    const positionsStateDetector = new PositionsStateDetector({ mongoDatabase: mongoDatabase });

    positionsStateDetector.onNewPosition(async (position, trader) => {
      console.log("New position added");
      bot.sendMessage('@AtomosTradingSignals',
`✨💸🚀 New Position 🚀💸✨

👨🏽💻 Trader : ${"Anonymous"}
💰 Pair : ${position.pair}
🔖 Type : ${position.direction}
🌿 Leverage : ${position.leverage}
⌛ Entry Price : ${position.entry_price}`
);
    });

    positionsStateDetector.onUpdatePosition(async (position, trader) => {
      console.log("Position updated");
      bot.sendMessage('@AtomosTradingSignals',
`♻️♻️♻️ Position Updated ♻️♻️♻️

👨🏽💻 Trader : ${"Anonymous"}
💰 Pair : ${position.pair}
🔖 Type : ${position.direction}
🌿 Leverage : ${position.leverage}
⌛ Entry Price : ${position.entry_price}
❇️ Size Change of : ${position.size - position.original_size}

✨✨✨ Size : ${position.original_size} ➡️ ${position.size} ✨✨✨`
);
    });

    positionsStateDetector.onPositionClose(async (position, trader) => {
      console.log("Close position");
      bot.sendMessage('@AtomosTradingSignals',
`🔒🔒🔒 Position Closed 🔒🔒🔒

👨‍💻 Trader : ${"Anonymous"}
💰 Pair : ${position.pair}
🔖 Type : ${position.direction}
🌿 Leverage : ${position.leverage}
💸 Size : ${position.size}
⌛ Entry Price : ${position.entry_price}
⌛ Closed Price : ${position.mark_price}

📈💶🚀 ROI : ${position.roi} 🚀💶📈`
);
    });

    positionsStateDetector.listenToOpenTradesCollection();
    positionsStateDetector.listenToOldTradesCollection();

  } catch (error) {
    if(mongoDatabase){
      await mongoDatabase.disconnect()
    }
    throw error;
  }
})();