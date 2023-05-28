//@ts-check

const querystring = require("node:querystring");
// const {Bybit} = require("../../../../Trader");



/**
 * @param {{
 *      method:"GET"|"POST"|string,
 *      url: string,
 *      mongoDatabase: import("../../../../MongoDatabase").MongoDatabase,
 *      req: import("http").IncomingMessage,
 *      res: import("http").ServerResponse
 * }} params
 */
module.exports.subAccountsRoutes = async function subAccountsRoutes({method,url,mongoDatabase,req,res}){
    try{
        console.log("(fn:subaccounts routes)");
        if(url.split("?")[0]==="/subaccounts"){///users/subaccounts?tg_user_id=2828
            // Get the params passed
            /**
             * @type {{
             *      tg_user_id: string
             * }}
             */
            const params = querystring.parse(url.split("?")[1]);
            console.log({params,tg_user_id:params.tg_user_id});
            const {tg_user_id:tg_user_id_String} = params;
            const tg_user_id = Number(tg_user_id_String);
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
                const user = await mongoDatabase.collection.usersCollection.findOne({
                    tg_user_id
                });
                console.log({user});
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
                    // login to user's bybit account and get subaccounts details
                    const subAccountsInDb = await mongoDatabase.collection.subAccountsCollection.getAllDocumentsBy({tg_user_id});
                    const subAccountsArray = await subAccountsInDb.toArray();
                    console.log({subAccountsArray});
                    /**
                     * @type {import("./types").SubAccounts_Routes_Payload_Interface}
                     */
                    const responsePayload  = {
                        success: false,
                        message: "",
                        data:{
                            sub_accounts:subAccountsArray,
                        }
                    };

                    res.write(JSON.stringify(responsePayload));
                    res.end();
                    
                }


            }

        }

    }catch(error){
        const newErrorMessage = `(fn:subAccountsRoutes) ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};