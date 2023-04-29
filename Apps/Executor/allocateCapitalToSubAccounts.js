/**
 * @param {{
*      user: import("../../MongoDatabase/collections/users/types").Users_Collection_Document_Interface,
*      trader: import("../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface,
*      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
*      bybit: import("../../Trader").Bybit 
* }} param0
*/
module.exports.allocateCapitalToSubAccounts = async function allocateCapitalToSubAccounts({
    mongoDatabase,trader,user,bybit
}){ 
    try {
        // Calculatte the acttual balances and the correct balances

        // Retrieve the subAccounts
        const userSubAccounts_Cursor = await mongoDatabase.collection.subAccountsCollection.getAllDocumentsBy({
            tg_user_id: user.tg_user_id,weight:{
                $gt:0
            }
        });

        // Get the 
       
    }catch(error){
        const newErrorMessage = `(fn:allocateCapitalToSubAccounts):${error.message}`;
        throw new Error(newErrorMessage);
    }
};



