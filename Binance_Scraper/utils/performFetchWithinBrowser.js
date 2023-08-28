const { sendRequestWithProxy } = require("../../Proxy");


/**
 * 
 * @param {string} url 
 * @param {{
 *      method:"GET"|"POST",
 *      body: string,
 *      heeaders:Object
 * }} param1 
 */
module.exports.performFetchWithinBrowser = async (url,{method,body,headers})=>{
    
    // const res = await fetch(url,{
    //     method,
    //     body,
    //     credentials:"include",
    //     // headers:{
    //     //     "Content-Type":"application/json",
    //     //     "User-Agent":"Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36"
    //     // }
    //     headers
    // });

    const res = await sendRequestWithProxy(url,{
        method,
        body,
        credentials:"include",
        // headers:{
        //     "Content-Type":"application/json",
        //     "User-Agent":"Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36"
        // }
        headers
    });
    return res;
};