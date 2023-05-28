const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 30002;


/**
 * 
 * @param {string} url 
 * @returns {Promise<{
 *  error:""|null,
 *  html:"",
 *  statusCode:number
 * }>}
 */
function getRequestedHTML(url){
    return new Promise((resolve)=>{
        try{
            // 
            const filePath = url==""||url==="/"?"./index.html":"."+url;
            console.log({filePath});
            if(fs.existsSync(filePath)){
                fs.readFile(filePath,(err,data)=>{
                    if(err){
                        throw err;
                    }
                    const str = data.toString("utf-8");
                    resolve({
                        error:err,
                        html: str,
                        statusCode:202
                    });
                });
            }else{
                // return 404 page
                resolve({
                    error:null,
                    html:"",
                    statusCode:404
                });
            }
        }catch(error){
            resolve({
                error:error,
                html:"",
                statusCode:404
            });
        }
    });
}



// const GET_Method_pagesUrlToHTML = {
//     "/": (cb)=>{
//         fs.readFile("./index.html",(err,data)=>{
//             if(err)cb(err,data);
//             const str = data.toString("utf-8");
            
//             cb(err,str);
//         });
//     },
//     "/components/app-sidenav/index.js":(cb)=>{
//         fs.readFile("./components/app-sidenav/index.js",(err,data)=>{
//             if(err)cb(err,data);
//             const str = data.toString("utf-8");
            
//             cb(err,str);
//         });
//     },
//     "/components/app-listbar/index.js":(cb)=>{
//         fs.readFile("./components/app-listbar/index.js",(err,data)=>{
//             if(err)cb(err,data);
//             const str = data.toString("utf-8");
            
//             cb(err,str);
//         });
//     },
//     "/assets/css/presets.css":(cb)=>{
//         fs.readFile("./assets/css/presets.css",(err,data)=>{
//             if(err)cb(err,data);
//             const str = data.toString("utf-8");
            
//             cb(err,str);
//         });
//     },
//     "/components/app-content/index.js":(cb)=>{
//         fs.readFile("./components/app-content/index.js",(err,data)=>{
//             if(err)cb(err,data);
//             const str = data.toString("utf-8");
            
//             cb(err,str);
//         });
//     },
//     "/components/user_content_component/index.js":(cb)=>{
//         fs.readFile("./components/user_content_component/index.js",(err,data)=>{
//             if(err)cb(err,data);
//             const str = data.toString("utf-8");
            
//             cb(err,str);
//         });
//     },
//     "/components/user_content_component/index.html":(cb)=>{
//         fs.readFile("./components/user_content_component/index.html",(err,data)=>{
//             if(err)cb(err,data);
//             const str = data.toString("utf-8");
//             console.log({str});
//             cb(err,str);
//         });
//     },
//     "404":()=>{
//         return "";
//     }
// };

http.createServer((req,res)=>{
    const method = req.method;
    const url = req.url;
    console.log({method,url});
    if(method==="GET"){
        getRequestedHTML(url).then((value)=>{
            res.statusCode = value.statusCode;
            res.write(value.html);
            res.end();
            // if(value.error){
            // }
        }).catch(err =>{
            console.log("(fn:getRequestedHTML)",err);
        });
        // const fn = GET_Method_pagesUrlToHTML[url];
        // console.log({fn});
        // if(!fn){
        //     // return 404 page
        //     res.write(GET_Method_pagesUrlToHTML["404"]());
        //     res.end();
        // }else {
        //     fn((err,page)=>{
        //         // console.log({page});
        //         res.write(page);
        //         res.end();
        //     });
        // }
    }
    
}).listen(PORT,()=>{
    console.log("Server running on port: "+PORT);
});