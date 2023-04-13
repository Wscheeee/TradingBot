/**
 * 
 * @param {number} ms 
 */
module.exports.sleepAsync = function sleepAsync(ms){
    console.log("fn:sleepAsync (ms: "+ms+")");
    return new Promise((resolve)=>{
        const timeout = setTimeout(()=>{
            clearTimeout(timeout);
            resolve(true);
        },ms);
    });
};