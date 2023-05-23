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
module.exports.usersRoutes = async function usersRoutes({method,url,mongoDatabase,req,res}){
    try{
        console.log("(fn:usersRoutes)");
        if(url==="/users"){
            if(method==="GET"){
                // return a list of users
                // Get the users from the db
                const users = await mongoDatabase.collection.usersCollection.getAllDocuments();
                const usersArray = await users.toArray();

                res.write(JSON.stringify({
                    success: true,
                    data:{
                        users: usersArray
                    }
                }));
                res.end();
                
            }
        }else if(url.split("?")[0]==="/users/subaccounts"){///users/subaccounts?tg_user_id=2828
            // Get the params passed
            /**
             * @type {{
             *      tg_user_id: string
             * }}
             */
            const params = querystring.parse(url.split("?")[1]);
            console.log({params,tg_user_id:params.tg_user_id});
            const {tg_user_id} = params;
            if(!tg_user_id){
                //error;
                res.write(JSON.stringify({
                    success: false,
                    message: "param (tg_user_id) is missing",
                    data:{
                        // users: usersArray
                    }
                }));
                res.end();
            }else {
                // get the user
                const user = await mongoDatabase.collection.usersCollection.findOne({tg_user_id});
                if(!user){
                    res.write(JSON.stringify({
                        success: false,
                        message: `user with tg_user_id:${tg_user_id} not found on db`,
                        data:{
                            // users: usersArray
                        }
                    }));
                }else {
                    console.log(`User found: tg_user_id:${tg_user_id}`);
                    // user found
                    // A user and subaccounts and tthe posittions in each subaccount
                    const subAcccountsAndOrdersObject_Array = [];
                    // login to user's bybit account and get subaccounts details
                    const subAccountsInDb = await mongoDatabase.collection.subAccountsCollection.getAllDocumentsBy({tg_user_id});
                    
                    while(await subAccountsInDb.hasNext()){
                        const subAccountDocument = await subAccountsInDb.next();
                        if(!subAccountDocument) break;

                        // login to subaccount and get the open positions
                        const bybitSubAccount = new Bybit({
                            millisecondsToDelayBetweenRequests: 5000,
                            privateKey: subAccountDocument.private_api,
                            publicKey: subAccountDocument.public_api,
                            testnet: subAccountDocument.testnet===false?false:true
                        });


                        // const orders = await bybitSubAccount.clients.bybit_RestClientV5.getOrderHistory({category:"linear",openOnly:0});
                        // const orders = await bybitSubAccount.clients.bybit_RestClientV5.getOrderHistory({category:"linear",orderFilter:"Order"});
                        // const orders = await bybitSubAccount.clients.bybit_RestClientV5.getActiveOrders({category:"linear",orderFilter:"Order"});
                        const orders = await bybitSubAccount.clients.bybit_RestClientV5.getPositionInfo_Realtime({category:"linear",settleCoin:"USDT"});

                        const obj = {
                            subAccountDocument,
                            orders
                        };
                        subAcccountsAndOrdersObject_Array.push(obj);
                    }

                    res.write(JSON.stringify({
                        success: false,
                        message: "",
                        data:{
                            user,
                            subAcccountsAndOrdersObject_Array
                        }
                    }));
                    res.end();
                }


            }

        }else if(url.split("?")[0]==="/user/subaccount/open-positions"){
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

            }
        }

    }catch(error){
        const newErrorMessage = `(fn:usersRoutes) ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};