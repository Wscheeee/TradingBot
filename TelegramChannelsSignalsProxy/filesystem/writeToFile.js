//@ts-check

const fs = require("node:fs");
/**
 * 
 * @param {string} path 
 * @param {string} data
 */
module.exports = function writeToFile(path,data){
    const FUNCTION_NAME = "(fn:writeToFile)";
    try {
        fs.writeFileSync(path,data);
        return;
    }catch(error){
        const newErrorMessage = `${FUNCTION_NAME}: ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};