//@ts-check

const http = require("http");


// local
const {usersRoutes} = require("./users/index");
const {subAccountsRoutes} = require("./subaccounts/index");
const {openPositionsRoutes} = require("./open_positions/index");

/**
 * @param {{
 *      port: number,
 *      mongoDatabase: import("../../../MongoDatabase").MongoDatabase
 * }} param
 */
module.exports.routes = async function routes({port,mongoDatabase}){
    try{
        /**
         * Set HTTP server and Routes
         */
        const server = http.createServer(async (req,res)=>{
            const method = req.method||"";
            const url = req.url||"";
            console.log({url,method,
                // origin:req.headers
            });
            
            res.writeHead(200,{
                "Content-Type":"application/json",
                "Access-Control-Allow-Origin":`${" http://localhost:30002"}`,
                // "Access-Control-Allow-Origin":"*",//`${"localhost:30002"}`,
                "Vary":"Origin,Accept-Encoding",
                "Access-Control-Allow-Headers":"access-control-allow-origin,Content-Type"
                // "Access-Control-Allow-Methods":"*",
                // "Origin":`${"localhost:30002"}`,
            });
            // if(method==="GET"||"POST"){
            //     res.writeHead(200,{
            //         // "Content-Type":"application/json",
            //         "Access-Control-Allow-Origin":`${req.headers.origin}`,
            //         "Vary":"Origin",
            //     });

            // }else {
            //     res.writeHead(200,{
            //         // "Content-Type":"application/json",
            //         "Access-Control-Allow-Origin":"*",
            //         "Vary":"Origin",
            //         "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS,POST,PUT",
            //         "Access-Control-Allow-Headers": "Content-Type, Authorization"
            //     });
            // }


            await usersRoutes({method,url,mongoDatabase,req,res});
            await subAccountsRoutes({method,url,mongoDatabase,req,res});
            await openPositionsRoutes({method,url,mongoDatabase,req,res});






        });
        server.listen(port,()=>{
            console.log("Server running on port: "+port);
        });
    }catch(error){
        const newErrorMessage = `(fn:routes) ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};