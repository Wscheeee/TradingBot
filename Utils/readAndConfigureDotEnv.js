const path = require('node:path');
const fs = require('node:fs');

module.exports.readAndConfigureDotEnv =  function readAndConfigureDotEnv(){
    /**
     * @type {{
     *  DATABASE_URI:string,
     *  TZ:string,
     *  DATABASE_NAME: string,
     *  IS_LIVE: boolean
     * }} DotEnvTypes
     */
    const dotEnvObj = {
        DATABASE_URI:"",
        TZ:"",
        DATABASE_NAME:"",
        IS_LIVE: false
    }
    const dataStr = fs.readFileSync(path.join(__dirname,'..','.env'),{encoding:'utf-8'});
    dataStr.split('\n').forEach((row)=>{
        const keyValueArray = row.split('=');
        const key = keyValueArray[0];
        const value = keyValueArray.slice(1,).join("=");
        //@ts-ignore
        dotEnvObj[key] = value
    })
    if(dotEnvObj.IS_LIVE){
        return dotEnvObj;

    }else {
        // use .env local
        const dataStrLocal = fs.readFileSync(path.join(__dirname,'..','.env.local'),{encoding:'utf-8'});
        dataStrLocal.split('\n').forEach((row)=>{
            const keyValueArray = row.split('=');
            const key = keyValueArray[0];
            const value = keyValueArray.slice(1,).join("=");
            
            //@ts-ignore
            dotEnvObj[key] = value
        })
        return dotEnvObj;
    }

}