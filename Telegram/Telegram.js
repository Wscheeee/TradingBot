/**
 * Send messages to telegram
 */

const {sendMessage} = require("./sendMessage");
const {readDotEnvFile} = require("./readDotEnvFile");

/**
 * @typedef {{chat_id:number,requestDelay:number}} Settings_Interface
 */
module.exports.Telegram = class Telegram {
    /**
     * @type {Settings_Interface}
     */
    #settings = {
        requestDelay: 5000,
        chat_id: 0
    };
    /**
     * @type {Number}
     */
    #chatId;


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
    constructor({chat_id,requestDelay}){
        // this.#chatId = chat_id;
        this.#chatId = readDotEnvFile().TELEGRAM_CHANNEL_ID;
        this.#settings ={
            chat_id: readDotEnvFile().TELEGRAM_CHANNEL_ID,
            requestDelay:requestDelay 
        }
    }
    /**
     * 
     * @param {string} message 
     */
    async sendMessage(message){
        await this.utils.sleepAsync();
        return await sendMessage({
            text:message,
            chat_id:this.#chatId
        })
    }
}

// const telegram = new Telegram({chat_id:Number(readDotEnvFile().TELEGRAM_CHANNEL_ID)});
// telegram.sendMessage("Hello")