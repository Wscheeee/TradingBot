//@ts-check
/***
 * APP :
 * -------
 * Runs 
 * :-
 * : 
 */



const { MongoDatabase } = require("../../MongoDatabase");

// const {sleepAsync} = require("../../Utils/sleepAsync");
const { readAndConfigureDotEnv } = require("../../Utils/readAndConfigureDotEnv");
// const {generateUID} = require("../../Utils/generateUID");
const {Logger} = require("../../Logger");
const {Telegram} = require("../../Telegram");
// const {IntervalLastInStackTaskRunner} = require("../../TaskRunner");
// const intervalLastInStackTaskRunner = new IntervalLastInStackTaskRunner({intervalMs:30000,uid:generateUID()});
const {TelegramChannelsSignalsProxy} = require("../../TelegramChannelsSignalsProxy");


// local
// const {createSubAccountsAndAllocateCapital_forAllUsers_InParalell} = require("./createSubAccountsAndAllocateCapital_forAllUsers_InParalell");

const APP_NAME = "App:CreateSubAccountsAndAllocateCapital";
const logger = new Logger({app_name:APP_NAME});
const {IS_LIVE} = require("../../appConfig");
// const { DateTime } = require("../../DateTime");
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE);
process.env.TZ = dotEnvObj.TZ;

(async ()=>{
    /**
     * @type {MongoDatabase}
     */ 
    let mongoDatabase = new MongoDatabase(dotEnvObj.DATABASE_URI);
    const telegramChannelsSignalsProxy = new TelegramChannelsSignalsProxy();
    try {
        
        logger.info("Start App");
        /***
		 * Error Telegram bot for sendding error messages to Telegram error channel.
		 */
        const telegramBot = new Telegram({telegram_bot_token:dotEnvObj.TELEGRAM_BOT_TOKEN,requestDelay:2000,polling:true});
        logger.info("Create Telegrambot");
        logger.addLogCallback("error",async (cbIndex,message)=>{
            await telegramBot.sendMessage(dotEnvObj.TELEGRAM_ERROR_CHHANNEL_ID,message);
            logger.info("Send error message to telegram error channel");
        });

        



        logger.info("Create Bybit Client");
      
        console.log(dotEnvObj);
        // mongoDatabase = new MongoDatabase(dotEnvObj.DATABASE_URI);
        if(!mongoDatabase)throw new Error("Error creating mongoDatabase");
        logger.info("Create DB");
        await mongoDatabase.connect(dotEnvObj.DATABASE_NAME);
        logger.info("Connect DB");

        telegramChannelsSignalsProxy.onTradeSignal((channelName,signal, originalMessage,replyToMessage)=>{
            console.log({
                channelName,signal,replyToMessage
            });
            //             const message = `
            // ChannelName: ${channelName}
            // OriginalMessage: ${originalMessage}
            // Signal: ${JSON.stringify(signal)}
            //             `;

            // Create Buttons
            const buttons = [
                [{ text: "Validate ✅", callback_data: "validate" },
                    { text: "Remove ❌", callback_data: "remove" }],
            ];
            // Mettre à jour le message avec les nouveaux boutons
            const newButtons = {
                inline_keyboard: buttons,
                resize_keyboard: true,
                one_time_keyboard: true
            };







            const message = `
${replyToMessage}            
${originalMessage}
Signal: ${JSON.stringify(signal,null,2)}
            `;
            telegramBot.sendMessage(dotEnvObj.TELEGRAM_ATOMOS_FOREX_VERIF_CHHANNEL_ID,
                message
                // .replaceAll(".","\\.")
                // .replaceAll("!","\\!")
                // .replaceAll("+","\\+")
                // .replaceAll("(","\\(")
                // .replaceAll(")","\\)")
                // .replaceAll("{","\\{")
                // .replaceAll("}","\\}")
                , { reply_markup: newButtons,
                    // parse_mode: "MarkdownV2",
                });
        });


        const lastUserActions = new Map();

        telegramBot.telegramBot.on("callback_query", async (callbackQuery) => {
            console.log("callback_query");
            console.log({callbackQuery});
            const action = callbackQuery.data;
            const userId = callbackQuery.from.id;
            const chatId = callbackQuery.message.chat.id;
            const messageId = callbackQuery.message.message_id;
            console.log({
                action,userId,chatId,messageId
            });

            const lastAction = lastUserActions.get(userId);
            // if (action === lastAction && (lastAction!=="reject" || lastAction!=="confirm")) {
            if (action === lastAction) {
                return;
            }
            if(lastAction==="validate"){
                if(action==="confirm"){
                    // traded
                    return;
                }else if(action==="reject"){
                    // reject
                    // go back to original message
                    // Create Buttons
                    const buttons = [
                        [{ text: "Validate ✅", callback_data: "validate" },
                            { text: "Remove ❌", callback_data: "remove" }],
                    ];
                    // Mettre à jour le message avec les nouveaux boutons
                    const newButtons = {
                        inline_keyboard: buttons,
                        resize_keyboard: true,
                        one_time_keyboard: true
                    };
                    await telegramBot.telegramBot.editMessageText(callbackQuery.message.text, {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: newButtons,
                        // parse_mode: "MarkdownV2",
                    });
                    return;
                }
            }else if(lastAction==="remove"){
                if(action==="confirm"){
                    // traded
                    return;
                }else if(action==="reject"){
                    // reject
                    // go back to original message
                    // Create Buttons
                    const buttons = [
                        [{ text: "Validate ✅", callback_data: "validate" },
                            { text: "Remove ❌", callback_data: "remove" }],
                    ];
                    // Mettre à jour le message avec les nouveaux boutons
                    const newButtons = {
                        inline_keyboard: buttons,
                        resize_keyboard: true,
                        one_time_keyboard: true
                    };
                    await telegramBot.telegramBot.editMessageText(callbackQuery.message.text, {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: newButtons,
                        // parse_mode: "MarkdownV2",
                    });
                    return;
                }
            }
            lastUserActions.set(userId, action);
            if (action === "validate") {

                const buttons = [
                    [{ text: "Confirm", callback_data: "confirm" }],
                    // [{ text: "Reject", callback_data: "reject" }],
                    [{ text: "↩️ Reject ↩️", callback_data: "reject" }]
                ];
                const newButtons = {
                    inline_keyboard: buttons,
                    resize_keyboard: true,
                    one_time_keyboard: true,
                };

                await telegramBot.telegramBot.editMessageText(callbackQuery.message.text, {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: newButtons,
                    // parse_mode: "MarkdownV2",
                });
            }else if(action==="remove"){
                const buttons = [
                    [{ text: "Confirm", callback_data: "confirm" }],
                    // [{ text: "Reject", callback_data: "reject" }],
                    [{ text: "↩️ Reject ↩️", callback_data: "reject" }]
                ];
                const newButtons = {
                    inline_keyboard: buttons,
                    resize_keyboard: true,
                    one_time_keyboard: true,
                };

                await telegramBot.telegramBot.editMessageText(callbackQuery.message.text, {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: newButtons,
                    // parse_mode: "MarkdownV2",
                });
            }
        });
        // function strategy() {
        // }

        await telegramChannelsSignalsProxy.start();







    }catch(error){

        if(mongoDatabase){
            await mongoDatabase.disconnect();
        }
        logger.error(JSON.stringify(error.message));
        
        // await sleepAsync(5000);
        // throw error;
    } 
})();