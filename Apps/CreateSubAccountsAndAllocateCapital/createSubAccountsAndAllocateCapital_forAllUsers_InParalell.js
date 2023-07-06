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
*      onError:(error:Error)=>any
* }} param0
*/
module.exports.createSubAccountsAndAllocateCapital_forAllUsers_InParalell =  async function createSubAccountsAndAllocateCapital_forAllUsers_InParalell({
    mongoDatabase,onError
}){
    console.log("(fn:createSubAccountsAndAllocateCapital_forAllUsers_InParalell)");
    try{
        onError(new Error("(fn:createSubAccountsAndAllocateCapital_forAllUsers_InParalell): running"));
        if(!mongoDatabase)return;
        console.log("Getting uusers with status ===true");
        // Loop through users and create requuired subaccounts
        const usersDocuments_Cursor = await mongoDatabase.collection.usersCollection.getAllDocumentsBy({
            status: true
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
                            bybit,mongoDatabase,user
                        });
                        // set last_sub_allocation_check_datetime
                        await mongoDatabase.collection.usersCollection.updateDocument(user._id,{
                            last_sub_allocation_check_datetime: new DateTime().now().date_time_string,
                            
                        });

                    }catch(error){
                        const nwErrorMessage = `(fn:createSubAccountsAndAllocateCapital_forAllUsers_InParalell) => (fn:request) user:${user.username} (${user.tg_user_id}) ${error.message}`;
                        error.message = nwErrorMessage;
                        onError(error);
                    }

                };
                requestsPromiseArray.push(request());

            }catch(error){
                const nwErrorMessage = `(fn:createSubAccountsAndAllocateCapital_forAllUsers_InParalell) ${error.message}`;
                error.message = nwErrorMessage;
                onError(error);
            }
        }
        
        await Promise.allSettled(requestsPromiseArray);
        return;
    }catch(error){
        const nwErrorMessage = `(fn:createSubAccountsAndAllocateCapital_forAllUsers_InParalell) ${error.message}`;
        error.message = nwErrorMessage;
        onError(error);
        // throw error;
    }
};