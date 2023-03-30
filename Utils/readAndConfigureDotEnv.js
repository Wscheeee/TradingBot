const path = require('node:path');
const fs = require('node:fs');

/**
 * 
 * @param {boolean} isLive 
 * @returns 
 */
module.exports.readAndConfigureDotEnv =  function readAndConfigureDotEnv(isLive=false){
    /**
     * @type {{
     *  DATABASE_URI:string,
     *  TZ:string,
     *  DATABASE_NAME: string,
     *  IS_LIVE: boolean,
     *  TELEGRAM_BOT_TOKEN: string,
     *  TELEGRAM_CHANNEL_ID: string,
     *  BYBIT_PUBLIC_KEY: string,
     *  BYBIT_PRIVATE_KEY: string,
     *  BYBIT_ACCOUNT_IS_LIVE: boolean
     * }} DotEnvTypes
     */
    const dotEnvObj = {
        DATABASE_URI:"",
        TZ:"",
        DATABASE_NAME:"",
        IS_LIVE: false,
        TELEGRAM_BOT_TOKEN: "",
        TELEGRAM_CHANNEL_ID: "",
        BYBIT_PRIVATE_KEY: "",
        BYBIT_PUBLIC_KEY: "",
        BYBIT_ACCOUNT_IS_LIVE: false
    }
    const dataStr = isLive? fs.readFileSync(path.join(__dirname,'..','.env'),{encoding:'utf-8'}): fs.readFileSync(path.join(__dirname,'..','.env.local'),{encoding:'utf-8'})
    dataStr.split('\n').forEach((row)=>{
        const keyValueArray = row.split('=');
        const key = keyValueArray[0];
        const value = keyValueArray.slice(1,).join("=");
        //@ts-ignore
        dotEnvObj[key] = value
    })
   return dotEnvObj;

}