//@ts-check
const {Bybit} = require("../../Trader");


// local
const {createSubAccountsForUserIfNotCreated} = require("./createSubAccountsForUserIfNotCreated");
const {allocateCapitalToSubAccounts} = require("./allocateCapitalToSubAccounts");
const { DateTime } = require("../../DateTime");
const { ifUserHasAtomosSubAccountsCreatedButNotLinkedInDBLink_andUserAtomosIsTrue } = require("./ifUserHasAtomosSubAccountsCreatedButNotLinkedInDBLink_andUserAtomosIsTrue");
const { ifUserHasAtomosSubAccountsCreatedButNotLinkedInDBLink_andUserAtomosIsFalse } = require("./ifUserHasAtomosSubAccountsCreatedButNotLinkedInDBLink_andUserAtomosIsFalse");

/**
 * 
 * @param {{
*      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
*      user?: import("../../MongoDatabase/collections/users/types").Users_Collection_Document_Interface,
*      tg_user_bot: import("../../Telegram").Telegram
*      onError:(error:Error)=>any
* }} param0
*/
module.exports.createSubAccountsAndAllocateCapital_forAllUsersWhoseLastAlloationIsMoreThan0neHourAgo_InParalell =  async function createSubAccountsAndAllocateCapital_forAllUsersWhoseLastAlloationIsMoreThan0neHourAgo_InParalell({
    mongoDatabase,onError,user,tg_user_bot
}){
    const FUNCTION_NAME = "(fn:createSubAccountsAndAllocateCapital_forAllUsersWhoseLastAlloationIsMoreThan0neHourAgo_InParalell)";
    console.log(FUNCTION_NAME);
    try{
        onError(new Error(FUNCTION_NAME+": running"));
        const passedInUser = user;
        if(!mongoDatabase)return;
        console.log("Getting uusers with status ===true");
        // Loop through users and create requuired subaccounts
        const oneHourAgo = new Date(Date.now()).toLocaleString("en-US", {
            month: "numeric",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            hour12: true
        }); // One hour ago
        const usersDocuments_Cursor = await mongoDatabase.collection.usersCollection.getAllDocumentsBy({ 
            status: true,
            last_sub_allocation_check_datetime: { $lte: oneHourAgo } 
        });
        console.log("Got users");
        const requestsPromiseArray = [];
        while(await usersDocuments_Cursor.hasNext()){
            try{
                const user = await usersDocuments_Cursor.next();
                console.log({user});
                console.log(`user: ${user?.tg_user_id}`);
                if(!user){
                    throw new Error(`user:!user ${user}`);
                }
                if(passedInUser && passedInUser.tg_user_id!==user.tg_user_id)continue;
                if(user.atomos===false && !user.custom_sub_account_configs || user.atomos===false && user.custom_sub_account_configs.length===0){
                    // User is set to use custom sub account config but has none
                    // Geet user's sub accountts and reset their details
                    const userSubAccountDocuments_Cursor = await mongoDatabase.collection.subAccountsCollection.getAllDocumentsBy({
                        tg_user_id: user.tg_user_id,
                        testnet: user.testnet
                    });
                    while(await userSubAccountDocuments_Cursor.hasNext()){
                        const userSubAccountDocument = await userSubAccountDocuments_Cursor.next();
                        if(!userSubAccountDocument)continue;
                        if(userSubAccountDocument.trader_uid!==""||userSubAccountDocument.trader_username!==""||userSubAccountDocument.weight!==0){
                            // update reset
                            await mongoDatabase.collection.subAccountsCollection.updateDocument(userSubAccountDocument._id,{
                                trader_uid:"",
                                trader_username:"",
                                weight:0
                            });

                        }
                    }
                    continue;
                }
                const request = async()=>{
                    try{
                        const bybit = new Bybit({
                            millisecondsToDelayBetweenRequests:5000,
                            privateKey: user.privateKey, 
                            publicKey: user.publicKey,
                            testnet: user.testnet===true?true:false // Doing this incase testnet is undefined but it shouldn't
                        });
                        // Check iif user account is UNIFIED 
                        const accountInfo_Res = await bybit.clients.bybit_RestClientV5.getAccountInfo();
                        console.log({accountInfo_Res});
                        if(accountInfo_Res.retCode!==0)throw new Error("accountInfo_Res:"+accountInfo_Res.retMsg);

                        if(accountInfo_Res.result.unifiedMarginStatus!==4){
                            console.log("unifiedMarginStatus!==4:");
                            throw new Error("Please upgrade your account to the pro version of Unified trade account or contact @Azmafr");
                        }
                        if(user.atomos===true){
                            await ifUserHasAtomosSubAccountsCreatedButNotLinkedInDBLink_andUserAtomosIsTrue({
                                bybit,mongoDatabase,user
                            });
         
                        }else {
                            // user.atomos === false
                            // Meaning that the user is following own config
                            // Get user's subAcccounts
                            const userSubAccountsDocuments_Cursor = await mongoDatabase.collection.subAccountsCollection.getAllDocumentsBy({
                                tg_user_id: user.tg_user_id,
                                testnet: user.testnet
                            });
                            const userSubAccountsDocuments_Array = await userSubAccountsDocuments_Cursor.toArray();
                            for(const subAccount of userSubAccountsDocuments_Array){
                                let subAccountConfig_weight = 0;
                                let subAccountConfig_trader_username = "";
                                let subAccountConfig_trader_uid = "";

                                let subAccountHasConfig = false;
                                if(user.custom_sub_account_configs && Array.isArray(user.custom_sub_account_configs)){
                                    for(const subAccountConfig of user.custom_sub_account_configs){
                                        if(subAccountConfig.sub_link_name===subAccount.sub_link_name ){
                                            subAccountConfig_weight = subAccountConfig.weight;
                                            subAccountConfig_trader_username = subAccountConfig.trader_username;
                                            subAccountConfig_trader_uid = subAccountConfig.trader_uid;
                                            
                                            subAccountHasConfig = true;
                                        }
                                    }

                                }
                                if(subAccountHasConfig===false){
                                    // reset the sub accountt
                                    if(subAccount.trader_uid!==subAccountConfig_trader_uid||subAccount.trader_username!==subAccountConfig_trader_username||subAccount.weight!==subAccountConfig_weight){
                                        await mongoDatabase.collection.subAccountsCollection.updateDocument(subAccount._id,{
                                            weight:subAccountConfig_weight,
                                            trader_uid:subAccountConfig_trader_uid,
                                            trader_username:subAccountConfig_trader_username
                                        });
                                    }
                                }else {
                                    if(subAccount.trader_uid!==subAccountConfig_trader_uid||subAccount.trader_username!==subAccountConfig_trader_username||subAccount.weight!==subAccountConfig_weight){
                                        await mongoDatabase.collection.subAccountsCollection.updateDocument(subAccount._id,{
                                            weight:subAccountConfig_weight,
                                            trader_uid:subAccountConfig_trader_uid,
                                            trader_username:subAccountConfig_trader_username
                                        });
                                    }
                                }

                            }
                            await ifUserHasAtomosSubAccountsCreatedButNotLinkedInDBLink_andUserAtomosIsFalse({
                                bybit,mongoDatabase,user
                            });

                            
                        }
                        await createSubAccountsForUserIfNotCreated({
                            bybit,
                            mongoDatabase,
                            user
                        });
                        await allocateCapitalToSubAccounts({
                            bybit,mongoDatabase,user,
                            onError:async (error)=>{
                                await tg_user_bot.sendMessage(user.chatId,error.message);
                                onError(error);
                            },
                            tg_user_bot
                        });
                        // set last_sub_allocation_check_datetime
                        await mongoDatabase.collection.usersCollection.updateDocument(user._id,{
                            last_sub_allocation_check_datetime: new DateTime().now().date_time_string,
                            
                        });

                    }catch(error){
                        await tg_user_bot.sendMessage(user.chatId,(error.message && error.message.includes("API key is invalid")?"⚠️ API Keys Invalid or Empty":error.message));
                        const nwErrorMessage = `${FUNCTION_NAME} => (fn:request) user:${user.username} (${user.tg_user_id}) ${(error.message && error.message.includes("API key is invalid")?"⚠️ API Keys Invalid or Empty":error.message)}`;
                        error.message = nwErrorMessage;
                        onError(error);
                    }

                };
                requestsPromiseArray.push(request());

            }catch(error){
                const nwErrorMessage = `${FUNCTION_NAME} ${error.message}`;
                error.message = nwErrorMessage;
                onError(error);
            }
        }
        
        await Promise.allSettled(requestsPromiseArray);
        return;
    }catch(error){
        const nwErrorMessage = `${FUNCTION_NAME} ${error.message}`;
        error.message = nwErrorMessage;
        onError(error);
        // throw error;
    }
};