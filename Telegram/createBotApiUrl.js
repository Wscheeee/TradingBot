const {readDotEnvFile}= require('./readDotEnvFile');
/**
 * 
 * @param {string} methodName 
 * @returns {{
 *      hostname: string,
 *      path: string,
 *      url: string
 * }}
 */
module.exports.createBotApiUrl =  function createBotApiUrl(methodName){
    const envObj = readDotEnvFile();
    const TELEGRAM_BOT_BASE_API_URL = `https://api.telegram.org/bot${envObj.TELEGRAM_BOT_TOKEN}/${methodName}` //https://api.telegram.org/bot<token>/METHOD_NAME
    // return TELEGRAM_BOT_BASE_API_URL;
    console.log({TELEGRAM_BOT_BASE_API_URL})
    return {
        hostname: 'https://api.telegram.org',
        path: `/bot${envObj.TELEGRAM_BOT_TOKEN}/${methodName}`,
        url: TELEGRAM_BOT_BASE_API_URL
    }
}
// https://api.telegram.org/bot52125704sds01:AAFDrj4TPp6AITk9fG5H0r1d-PZYKUsfOXM/getupdates?limit=100