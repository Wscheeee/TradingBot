//@ts-check

const querystring = require("node:querystring");
const {Bybit} = require("../../../../Trader");


/**
 * 
 * @param {{
 *    private_api: string,
 *    public_api: string,
 *    testnet: boolean
 * }} param0     
 * @returns 
 */
async function getOpenOrders({
    private_api,public_api,testnet
}){
    console.log("Getting: getOpenOrders");
    const bybitSubAccount = new Bybit({
        millisecondsToDelayBetweenRequests: 1000,//5000,
        privateKey: private_api,
        publicKey: public_api,
        testnet: testnet===false?false:true
    });

    const orders = await bybitSubAccount.clients.bybit_RestClientV5.getPositionInfo_Realtime({category:"linear",settleCoin:"USDT"});
    console.log("Got: getOpenOrders");
    return orders.result.list;
}
module.exports.getOpenOrders = getOpenOrders;

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
             *      sub_account_uid:string
             * }}
             */
            const params = querystring.parse(url.split("?")[1]);
            console.log({params,tg_user_id:params.sub_account_uid});
            const {sub_account_uid:sub_account_uid_String} = params;
            if(!sub_account_uid_String){
                //error;
                res.write(JSON.stringify({
                    success: false,
                    message: "param (subaccount_uid) is missing",
                    data:{ }
                }));
                res.end();
            }else {
                const sub_account_uid = Number(sub_account_uid_String);
                // Get sub account details from db
                console.log("Getting SubAccount document");
                const subAccountDocument = await mongoDatabase.collection.subAccountsCollection.findOne({
                    sub_account_uid: sub_account_uid
                });

                if(!subAccountDocument){
                    //error;
                    res.write(JSON.stringify({
                        success: false,
                        message: `subAccountDoc not found of subaccount_uid:${sub_account_uid}`,
                        data:{ }
                    }));
                    res.end();
                }else {
                    console.log("Got SubAccount document");
                    // login to sub account
                  
                    const orders = await getOpenOrders({
                        private_api: subAccountDocument.private_api,
                        public_api: subAccountDocument.public_api,
                        testnet: subAccountDocument.testnet===false?false:true
                    });
                    /**
                     * @typedef {{
                     *      success: boolean,
                     *      message: string,
                     *      data: {
                     *          orders: ReturnType<import("../")>
                     *      }
                     * }} GetSubAccountOpenPositions_ResponsePayload_Interface
                     */
                    res.write(JSON.stringify({
                        success: false,
                        message: "",
                        data:{
                            // subAcccountsAndOrdersObject_Array
                            orders
                        }
                    }));
                    
                    res.end();
                    console.log("End");
                }



            }
        }

    }catch(error){
        const newErrorMessage = `(fn:openPositionsRoutes) ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};