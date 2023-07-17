// /**
//  * Send messages to telegram
//  */

// const {sendMessage} = require("./sendMessage");
// const {readDotEnvFile} = require("./readDotEnvFile");
const TelegramBot = require("./node_modules/node-telegram-bot-api/src/telegram");



/**
 * @typedef {{telegram_bot_token:string,requestDelay:number,polling?:boolean}} Settings_Interface
 */
module.exports.Telegram = class Telegram {
    /**
     * @type {TelegramBot}
     */
    telegramBot;
    /**
     * @type {Settings_Interface}
     */
    #settings = {
        requestDelay: 5000,
        telegram_bot_token: 0
    };


    /**
     * @type {{
     *  sleepAsync: async()=>any
     * }}
     */
    utils= {
        sleepAsync : async ()=>{
            console.log("Telegram sleep delay(milliseconds):",this.#settings.requestDelay);
            if(this.#settings.requestDelay==0 ||!this.#settings.requestDelay)return;
            return new Promise((resolve)=>{
                const timeout = setTimeout(()=>{
                    clearTimeout(timeout);
                    resolve(true);
                },this.#settings.requestDelay);
            });
        }
    };

    /**
     * 
     * @param {Settings_Interface} settings 
     */
    constructor({requestDelay,telegram_bot_token,polling}){
        this.#settings ={
            telegram_bot_token:telegram_bot_token,
            requestDelay:requestDelay,
            polling: polling
        };
        this.telegramBot = new TelegramBot(telegram_bot_token,{polling:polling?polling:false});

        this.telegramBot.on("polling_error", (error) => {
            console.log(error.code);  // => 'EFATAL'
            // implement your retry logic here
            this.telegramBot = new TelegramBot(telegram_bot_token,{polling:polling?polling:false});
        });
    }


    /**
     * @param {string|number} chatId
     * @param {string} message 
     * @param {{}} [form] 
     */
    async sendMessage(chatId,message,form){ 
        await this.utils.sleepAsync();
        return await this.telegramBot.sendMessage(chatId,message,form);
    }


};




