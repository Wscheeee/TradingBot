//@ts-check

const querystring = require("node:querystring");
const {Bybit} = require("../../../../Trader");



/**
 * @param {{
 *      method:"GET"|"POST"|string,
 *      url: string,
 *      mongoDatabase: import("../../../../MongoDatabase").MongoDatabase,
 *      req: import("http").IncomingMessage,
 *      res: import("http").ServerResponse
 * }} params
 */
module.exports.openPositionsRoutes = async function openPositionsRoutes({method,url,mongoDatabase,req,res}){
    try{
        console.log("(fn:openPositionsRoutes)");
        if(url.split("?")[0]==="/open-positions"){
            /**
             * @type {{
             *      subaccount_uid:string
             * }}
             */
            const params = querystring.parse(url.split("?")[1]);
            console.log({params,tg_user_id:params.subaccount_uid});
            const {subaccount_uid} = params;
            if(!subaccount_uid){
                //error;
                res.write(JSON.stringify({
                    success: false,
                    message: "param (subaccount_uid) is missing",
                    data:{ }
                }));
                res.end();
            }else {
                // Get sub account details from db
                const subAccountDocument = await mongoDatabase.collection.subAccountsCollection.findOne({
                    sub_account_uid: Number(subaccount_uid)
                });

                if(!subAccountDocument){
                    //error;
                    res.write(JSON.stringify({
                        success: false,
                        message: `subAccountDoc not found of subaccount_uid:${subaccount_uid}`,
                        data:{ }
                    }));
                    res.end();
                }else {
                    // login to sub account
                    // const subAcccountsAndOrdersObject_Array = [];
                    // login to subaccount and get the open positions
                    const bybitSubAccount = new Bybit({
                        millisecondsToDelayBetweenRequests: 5000,
                        privateKey: subAccountDocument.private_api,
                        publicKey: subAccountDocument.public_api,
                        testnet: subAccountDocument.testnet===false?false:true
                    });

                    const orders = await bybitSubAccount.clients.bybit_RestClientV5.getPositionInfo_Realtime({category:"linear",settleCoin:"USDT"});

                    res.write(JSON.stringify({
                        success: false,
                        message: "",
                        data:{
                            // subAcccountsAndOrdersObject_Array
                            orders
                        }
                    }));
                    res.end();
                }



            }
        }

    }catch(error){
        const newErrorMessage = `(fn:openPositionsRoutes) ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};