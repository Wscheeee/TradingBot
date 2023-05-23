//@ts-check

const http = require("http");


// local
const {usersRoutes} = require("./users/index");

/**
 * @param {{
 *      port: number,
 *      mongoDatabase: import("../../../MongoDatabase").MongoDatabase,
 *      Bybit: import("../../../Trader").Bybit
 * }} param
 */
module.exports.routes = async function routes({port,mongoDatabase,Bybit}){
    try{
        /**
         * Set HTTP server and Routes
         */
        const server = http.createServer(async (req,res)=>{
            const method = req.method||"";
            const url = req.url||"";
            res.writeHead(200,{"Content-Type":"application/json"});


            await usersRoutes({method,url,mongoDatabase,Bybit,req,res});
            






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