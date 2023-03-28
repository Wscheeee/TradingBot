"use-strict";
//@ts-check
const path = require('path');
const fs = require('fs');

module.exports.readDotEnvFile =  function readDotEnvFile(){
    /**
     * @typedef {{
     *    TELEGRAM_BOT_TOKEN:string  
     *    TELEGRAM_CHANNEL_ID:string  
     * }} DotEnvTypes
     */
    /**
     * @type {DotEnvTypes}
     */
    const dotEnvObj = {
        TELEGRAM_BOT_TOKEN:'',
        TELEGRAM_CHANNEL_ID:""
    }
    const dataStr = fs.readFileSync(path.join(__dirname,'.env'),{encoding:'utf-8'});
    dataStr.split('\n').forEach((row)=>{
        const keyValueArray = row.split('=');
        const key = keyValueArray[0];
        const value = keyValueArray.slice(1,).join("=");
        //@ts-ignore
        dotEnvObj[key] = value
    })
    return dotEnvObj;
}


