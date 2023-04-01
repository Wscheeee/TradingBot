/**
 * 
 * @param {number} ms 
 */
module.exports.sleepAsync = function sleepAsync(ms){
    return new Promise((resolve,reject)=>{
        const timeout = setTimeout(()=>{
            clearTimeout(timeout);
            resolve(true)
        },ms)
    })
}