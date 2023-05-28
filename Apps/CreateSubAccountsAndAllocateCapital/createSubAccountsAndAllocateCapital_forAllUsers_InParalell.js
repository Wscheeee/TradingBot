//@ts-check
const {Bybit} = require("../../Trader");


// local
const {createSubAccountsForUserIfNotCreated} = require("./createSubAccountsForUserIfNotCreated");
const {allocateCapitalToSubAccounts} = require("./allocateCapitalToSubAccounts");
const { DateTime } = require("../../DateTime");

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
        // Loop through users and create requuired subaccounts
        const usersDocuments_Cursor = await mongoDatabase.collection.usersCollection.getAllDocuments();
        while(await usersDocuments_Cursor.hasNext()){
            try{
                const user = await usersDocuments_Cursor.next();
                console.log(`user: ${user?.tg_user_id}`);
                if(!user)return;
                const bybit = new Bybit({
                    millisecondsToDelayBetweenRequests:5000,
                    privateKey: user.privateKey,
                    publicKey: user.publicKey,
                    testnet: user.testnet===true?true:false // Doing this incase testnet is undefined but it shouldn't
                });
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
                const nwErrorMessage = `(fn:createSubAccountsAndAllocateCapital_forAllUsers_InParalell) ${error.message}`;
                error.message = nwErrorMessage;
                onError(error);
            }
        }
        return;
    }catch(error){
        const nwErrorMessage = `(fn:createSubAccountsAndAllocateCapital_forAllUsers_InParalell) ${error.message}`;
        error.message = nwErrorMessage;
        onError(error);
        // throw error;
    }
};