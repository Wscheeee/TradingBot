// /**
//  * Send messages to telegram
//  */

const {sendMessage} = require("./sendMessage");
// const {readDotEnvFile} = require("./readDotEnvFile");
const TelegramBot = require("./node_modules/node-telegram-bot-api/src/telegram");


/**
 * @typedef {{telegram_bot_token:string,requestDelay:number}} Settings_Interface
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
            console.log("Telegram sleep delay(milliseconds):",this.#settings.requestDelay)
            if(this.#settings.requestDelay==0 ||!this.#settings.requestDelay)return;
            return new Promise((resolve,reject)=>{
                const timeout = setTimeout(()=>{
                    clearTimeout(timeout);
                    resolve(true)
                },this.#settings.requestDelay)
            })
        }
    }

    /**
     * 
     * @param {Settings_Interface} settings 
     */
    constructor({requestDelay,telegram_bot_token}){
        this.#settings ={
            telegram_bot_token:telegram_bot_token,
            requestDelay:requestDelay 
        };
        this.telegramBot = new TelegramBot(telegram_bot_token,{polling:true})
    }
    /**
     * @param {string} chatId
     * @param {string} message 
     */
    async sendMessage(chatId,message){ 
        await this.utils.sleepAsync();
        return await this.telegramBot.sendMessage(chatId,message)
    }
}

// // const telegram = new Telegram({chat_id:Number(readDotEnvFile().TELEGRAM_CHANNEL_ID)});
// // telegram.sendMessage("Hello")



