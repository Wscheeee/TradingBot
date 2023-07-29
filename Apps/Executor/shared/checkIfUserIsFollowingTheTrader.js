//@ts-check
"use-strict";

/**
 * 
 * @param {{
*      mongoDatabase: import("../../../MongoDatabase").MongoDatabase,
*      user: import("../../../MongoDatabase/collections/users/types").Users_Collection_Document_Interface,
*      trader: import("../../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface,
 * }} param0 
 */
module.exports.checkIfUserIsFollowingTheTrader = async function ({
    user,mongoDatabase,trader
}){
    const FUNCTION_NAME = "(fn:checkIfUserIsFollowingTheTrader)";
    console.log(FUNCTION_NAME);
    try{
        let userIsFollowingTheTrader = false;
        if(user.atomos===false && user.custom_sub_account_configs && user.custom_sub_account_configs.length>0){
            for(const s of user.custom_sub_account_configs){
                if(s.trader_username===trader.username){
                    userIsFollowingTheTrader = true;
                }
            }
        }

        if(user.atomos===true){
            const configOfTrader = await mongoDatabase.collection.subAccountsConfigCollection.findOne({
                trader_username:trader.username
            });
            if(configOfTrader){
                userIsFollowingTheTrader = true;
            }
        }
        return userIsFollowingTheTrader;
    }catch(error){
        error.message = `${FUNCTION_NAME} ${error.message}`;
        throw error;
    }

}