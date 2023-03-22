const path = require('node:path');
const fs = require('node:fs');

module.exports.readAndConfigureDotEnv =  function readAndConfigureDotEnv(){
    /**
     * @type {{
     *  DATABASE_URI:string,
     *  TZ:string,
     *  DATABASE_NAME: string
     * }} DotEnvTypes
     */
    const dotEnvObj = {
        DATABASE_URI:"",
        TZ:"",
        DATABASE_NAME:""
    }
    const dataStr = fs.readFileSync(path.join(__dirname,'..','.env'),{encoding:'utf-8'});
    dataStr.split('\n').forEach((row)=>{
        const keyValueArray = row.split('=');
        const key = keyValueArray[0];
        const value = keyValueArray[1];
        //@ts-ignore
        dotEnvObj[key] = value
    })

    return dotEnvObj;
}