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
                if(user?.tg_user_id!==101) continue;
                console.log(`user: ${user?.tg_user_id}`);
                if(!user || user.atomos===false && !user.custom_sub_account_configs){
                    throw new Error(`user:${user?.username} ${user?.tg_user_id} !user || user.atomos===false && !user.custom_sub_account_configs`);
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
                                let subAccountHasConfig = false;
                                for(const subAccountConfig of user.custom_sub_account_configs){
                                    if(subAccountConfig.sub_link_name===subAccount.sub_link_name){
                                        subAccountHasConfig = true;
                                    }
                                }
                                if(subAccountHasConfig===false){
                                    // reset the sub accountt
                                    await mongoDatabase.collection.subAccountsCollection.updateDocument(subAccount._id,{
                                        weight:0,
                                        trader_uid:""
                                    });
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
                        const nwErrorMessage = `(fn:createSubAccountsAndAllocateCapital_forAllUsers_InParalell) => (fn:request) ${error.message}`;
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