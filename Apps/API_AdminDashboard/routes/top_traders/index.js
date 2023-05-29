//@ts-check

const querystring = require("node:querystring");
// const {Bybit} = require("../../../../Trader");

// locals
const {getAllTopTraders} = require("./utils/getAllTopTraders");
const {getOpenPositionsOfATrader} = require("./utils/getOpenPositionsOfATrader");

const PATHS = {
    getAllTopTraders:({limit,skip})=>`/top-traders?limit=${limit}&skip=${skip}`,
};

/**
 * @param {{
 *      method:"GET"|"POST"|string,
 *      url: string,
 *      mongoDatabase: import("../../../../MongoDatabase").MongoDatabase,
 *      req: import("http").IncomingMessage,
 *      res: import("http").ServerResponse
 * }} params
 */
module.exports.topTradersRoutes = async function topTradersRoutes({method,url,mongoDatabase,req,res}){
    const FUNCTION_NAME = "(fn:topTradersRoutes)";
    try{
        console.log(FUNCTION_NAME);
        if(url.split("?")[0]==="/top-traders"){//http://localhost:30003/top-traders?limit=1&skip=0
            // Get the params passed
            /**
             * @type {{
             *      skip: string,
             *      limit: string
             * }}
             */
            const params = querystring.parse(url.split("?")[1]);
            const {limit:limit_String,skip:skip_String} = params;
            
            if(!limit_String || !skip_String){
                //error;
                res.write(JSON.stringify({
                    success: false,
                    message: "param (skip||limit) is missing",
                    data:{
                    }
                }));
                res.end();
            }else {
                const limit = Number(limit_String);
                const skip = Number(skip_String);
                // get the topTraders
                const topTradersArray = await getAllTopTraders({
                    mongoDatabase,
                    limit,
                    skip
                });
                console.log({topTradersArray});
                
                /**
                 * @type {import("./types").GetAllTopTraders_Routes_Payload_Interface}
                 */
                const responsePayload  = {
                    success: true,
                    message: "",
                    data:{
                        top_traders:topTradersArray,
                    }
                };

                res.write(JSON.stringify(responsePayload));
                res.end();


            }

        }else if(url.split("?")[0]==="/trader-open-positions"){//http://localhost:30003/trader-open-positions?limit=1&skip=0&trader_uid=HAHHAHSGGD
            // Get the params passed
            /**
             * @type {{
             *      skip: string,
             *      limit: string,
             *      trader_uid: string
             * }}
             */
            const params = querystring.parse(url.split("?")[1]);
            const {limit:limit_String,skip:skip_String,trader_uid:trader_uid_String} = params;
            
            if(!limit_String || !skip_String || !trader_uid_String){
                //error;
                res.write(JSON.stringify({
                    success: false,
                    message: "param (skip||limit) is missing",
                    data:{
                    }
                }));
                res.end();
            }else {
                const limit = Number(limit_String);
                const skip = Number(skip_String);
                const trader_uid = trader_uid_String;
                // get the topTraders
                const traderOpenPositions_Array = await getOpenPositionsOfATrader({
                    mongoDatabase,
                    limit,
                    skip,
                    trader_uid
                });
                console.log({traderOpenPositions_Array});
                
                /**
                 * @type {import("./types").GetTraderOpenPositions_Routes_Payload_Interface}
                 */
                const responsePayload  = {
                    success: true,
                    message: "",
                    data:{
                        trader_open_positions:traderOpenPositions_Array,
                    }
                };

                res.write(JSON.stringify(responsePayload));
                res.end();


            }

        }

    }catch(error){
        const newErrorMessage = `${FUNCTION_NAME} ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};