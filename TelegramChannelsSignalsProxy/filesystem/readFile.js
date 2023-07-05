//@ts-check

const fs = require("node:fs");
/**
 * 
 * @param {string} path 
 * @returns {string|null}
 */
module.exports = function readfile(path){
    const FUNCTION_NAME = "(fn:readFile)";
    try {
        if(fs.existsSync(path)===false){
            console.log("File not found:",path);
            return null;
        }else {
            // check if file exists
            return fs.readFileSync(path,{encoding:"utf-8"});
        }
    }catch(error){
        const newErrorMessage = `${FUNCTION_NAME}: ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};