const https = require("https");

//  * @param {{url,method:"GET"|"POST",}} param0 

/**
 * @template {T}
 * @param {https.RequestOptions} options 
 * @param {string} postBody 
 * @returns {Promise<T>}
 *  */ 
exports.performFetch = function performFetch({method,host,pathname,headers},postBody){
    return new Promise((resolve,reject)=>{
        console.log("(fn:performFetch)")
        const req = https.request({
            host,
            pathname,
            method,
            headers,
            
        },(res)=>{
            res.on("error",(err)=>{
                reject(err);

            })
            let dataStr = "";
            res.on("data",(chunk)=>{
                dataStr +=chunk;
                console.log({dataStr})
            });
            res.on("end",()=>{
                /**
                 * @type {T}
                 */
                const data = JSON.parse(dataStr);
                resolve(data)
            })
        }).on("error",(error)=>{
            reject(error)
        })


        req.write(postBody);
        req.end()

    })
}
// exports.performFetch = function performFetch({method,host,path}){
//     return new Promise((resolve,reject)=>{
//         console.log("(fn:performFetch)")
//         if(method==="GET"){
//             https.get(url,(res)=>{
//                 res.on("error",(err)=>{
//                     reject(err);

//                 })
//                 let dataStr = "";
//                 res.on("data",(chunk)=>{
//                     dataStr +=chunk;
//                 });
//                 res.on("end",()=>{
//                     /**
//                      * @type {T}
//                      */
//                     const data = JSON.parse(dataStr);
//                     resolve(data)
//                 })
//             }).on("error",(err)=>{
//                 reject(error)
//             })
//         }else if(method==="POST"){
            
//         }

//     })
// }