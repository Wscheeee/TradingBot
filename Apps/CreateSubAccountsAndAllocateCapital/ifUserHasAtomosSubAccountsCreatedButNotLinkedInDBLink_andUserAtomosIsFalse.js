//@ts-check
// ifUserHasAttomosSubAccountsCreatedButNotLinkedInDBLink.js


//locals
const {createSubAccountApiKeys} = require("./createSubAccountApiKeys");

/** 
 * @param {{
*      user: import("../../MongoDatabase/collections/users/types").Users_Collection_Document_Interface,
*      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
*      bybit: import("../../Trader").Bybit 
* }} param0
*/
module.exports.ifUserHasAtomosSubAccountsCreatedButNotLinkedInDBLink_andUserAtomosIsFalse = async function ifUserHasAtomosSubAccountsCreatedButNotLinkedInDBLink_andUserAtomosIsFalse({
    bybit,mongoDatabase,user
}){
    const FUNCTION_NAME = "(FN:ifUserHasAtomosSubAccountsCreatedButNotLinkedInDBLink_andUserAtomosIsFalse)";
    console.log(FUNCTION_NAME);
    try{
        // Get the Sub Accounts present in user's bybit
        const getSubUIDList_Res = await bybit.clients.bybit_RestClientV5.getSubUIDList();
        if(getSubUIDList_Res.retCode!==0)throw new Error(getSubUIDList_Res.retMsg);
        const subAccountsPresentInUserBybitAccount_Array = getSubUIDList_Res.result.subMembers;
        const atomosSubAccountsPresentInUserBybitAccount_Array = subAccountsPresentInUserBybitAccount_Array.filter((subMemberV5)=>{
            if(subMemberV5.username.toLowerCase().includes("atomos")){
                return subMemberV5;
            }
        });
        if(atomosSubAccountsPresentInUserBybitAccount_Array.length===0){
            console.log("User has no Atomos sub accounts in their bybit account");
            return;
        }
        console.log(`User has (${atomosSubAccountsPresentInUserBybitAccount_Array.length}) Atomos sub accounts in their bybit account`);

        // Get user sub accounts saved in db
        const userSubAcccountsSavedInDb_Cursor = await mongoDatabase.collection.subAccountsCollection.getAllDocumentsBy({
            tg_user_id: user.tg_user_id,
            testnet: user.testnet
        });
        const userSubAcccountsSavedInDb_Array = await userSubAcccountsSavedInDb_Cursor.toArray();

        const linkedSubLinkNames_Array = [];// Store a list of sub link names that are alreaddy linked in db andd bybit account
        // Check if the sub accounts have been linked with subaccounts in db
        const unlinked_atomosSubAccountsPresentInUserBybitAccount_Array = atomosSubAccountsPresentInUserBybitAccount_Array.filter((subAccountInBybit)=>{
            let isLinked = false;
            for(const subAccountInDB of userSubAcccountsSavedInDb_Array){
                if(subAccountInDB.sub_account_username===subAccountInBybit.username &&
                    String(subAccountInDB.sub_account_uid) === String(subAccountInBybit.uid) ){
                    isLinked = true;
                    linkedSubLinkNames_Array.push(subAccountInDB.sub_link_name);
                }
            }
            if(isLinked===false){
                return subAccountInBybit;
            }
        });

        if(unlinked_atomosSubAccountsPresentInUserBybitAccount_Array.length===0){
            console.log("All the subaccounts in Bybit are linked");
            return;
        }
        console.log(`(${unlinked_atomosSubAccountsPresentInUserBybitAccount_Array.length}) Atomos subAccounts in bybit are unliked`);


        // Get  sub account configs
        // const subAccountConfigDocuments_Cursor = await mongoDatabase.collection.subAccountsConfigCollection.getAllDocuments();
        const subAccountConfigDocuments_Array = user.custom_sub_account_configs;//await subAccountConfigDocuments_Cursor.toArray();

        const unlikedSubAccountConfigDocuments_Array = subAccountConfigDocuments_Array.filter((subAccountConfigDocument)=>{
            if(linkedSubLinkNames_Array.includes(subAccountConfigDocument.sub_link_name)===false){
                return subAccountConfigDocument;
            }
        });


        // Link unlikedSubAccountConfigDocuments with already existing unlinked sub accounts in bybit
        for(const unlikedSubAccountConfigDocument of unlikedSubAccountConfigDocuments_Array){
            //Create new sub account documents in sub Account collection
            const atomosSubAccountInBybit = unlinked_atomosSubAccountsPresentInUserBybitAccount_Array.pop();
            if(!atomosSubAccountInBybit)return;
            // Create apis
            const createSubAccountAPIKeys_Response = await createSubAccountApiKeys({
                bybit,
                sub_account_api_note:"Atomos Default Config",
                sub_account_uid:atomosSubAccountInBybit.uid
            });
            await mongoDatabase.collection.subAccountsCollection.createNewDocument({
                document_created_at_datetime: new Date(),
                private_api: createSubAccountAPIKeys_Response.result.secret,
                public_api: createSubAccountAPIKeys_Response.result.apiKey,
                server_timezone: process.env.TZ||"",
                sub_account_uid: String(atomosSubAccountInBybit.uid),
                sub_account_username: atomosSubAccountInBybit.username,
                sub_link_name: unlikedSubAccountConfigDocument.sub_link_name,
                testnet: user.testnet,
                tg_user_id: user.tg_user_id,
                trader_uid: unlikedSubAccountConfigDocument.trader_uid,
                trader_username: unlikedSubAccountConfigDocument.trader_username,
                weight: unlikedSubAccountConfigDocument.weight?Number(unlikedSubAccountConfigDocument.weight):0
            });
        }

        return;


        
    }catch(error){
        const newErrorMessage = `${FUNCTION_NAME}: ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};