
//@js-check

/**
 * @param {{
 *      user: import("../../MongoDatabase/collections/users/types").Users_Collection_Document_Interface,
 *      trader: import("../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface,
 *      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
 *      bybit: import("../../Trader").Bybit
 * }} param0
 */
module.exports.createSubAccountsForUserIfNotCreated = async function createSubAccountsForUserIfNotCreated({
    mongoDatabase,trader,user,bybit
}){
    try {
        console.log("(ffn:createSubAccountsForUserIfNotCreated)");
        // 1. Check if user has atomos set to true or false
        const userIsAtomos = user.atomos||false;
        // if userIsAtomos set sub accounts based on user selection
        // if not userIsAtomos set sub collection based on default
        if(!userIsAtomos){
            const getAllSubCollectionsForUser_Cursor = await mongoDatabase.collection.subAccountsCollection.getAllDocumentsBy({
                tg_user_id: user.tg_user_id
            });
            const allSubCollectionsForUser_Array = await getAllSubCollectionsForUser_Cursor.toArray();

            // Get sub acccounts Configs
            const subAccountsConfig_Cursor = await mongoDatabase.collection.subAccountsConfigCollection.getAllDocuments();
            const subAccountsConfig_documents_Array = await subAccountsConfig_Cursor.toArray();
            if(subAccountsConfig_documents_Array.length===0)throw new Error("Sub_Account_Config collection: No documentt found in collection. Collection must have a sub account config document ");

            // Get Existing Sub Accounts on Bybit 
            const getSubUIDList_Res = await bybit.clients.bybit_RestClientV5.getSubUIDList();
            if(getSubUIDList_Res.retCode!==0)throw new Error(getSubUIDList_Res.retMsg);
            const subAccountsPresentInUserBybitAccount_Array = getSubUIDList_Res.result.subMembers;
            console.log({subAccountsPresentInUserBybitAccount_Array});
            // Check that Sub Accounts have been created for traders listed in the SubAccountsConfig
            for(const traderSubAccountConfig of subAccountsConfig_documents_Array){
                const traderSubAccountInfoInSubAcccountsCollection = allSubCollectionsForUser_Array.find((doc)=>doc.trader_uid===traderSubAccountConfig.trader_uid);
                console.log({traderSubAccountInfoInSubAcccountsCollection});
                if(traderSubAccountInfoInSubAcccountsCollection){
                    // trader sub account info is already savedd in subaccounts collection
                    // Check that the sub account uid matches any of the eisting sub accounts on bybit
                    const traderSubAccountInBybit = subAccountsPresentInUserBybitAccount_Array.find((subMemberV5)=> (
                        subMemberV5.username===traderSubAccountInfoInSubAcccountsCollection.sub_account_username &&
                        subMemberV5.uid===String(traderSubAccountInfoInSubAcccountsCollection.sub_account_uid)
                    ));
                    console.log({traderSubAccountInBybit});
                    if(traderSubAccountInBybit){
                        console.log("Trader sub Account exists");
                    }else {
                        // create sub Account
                        await createSubAccount_itsApi_andSaveInDB({
                            bybit,mongoDatabase,trader,user,
                            sub_account_api_note: "Atomos User Config",
                            sub_account_note:"Atomos User Config",
                            sub_account_testnet:traderSubAccountConfig.testnet,
                            sub_account_trader_weight: traderSubAccountConfig.weight,
                            sub_account_sub_link_name: traderSubAccountConfig.sub_link_name
                        });
                    }
                }else {
                    // Meaning that trader sub account info not found in sub accounts collection
                    // create sub Account
                    await createSubAccount_itsApi_andSaveInDB({
                        bybit,mongoDatabase,trader,user,
                        sub_account_api_note: "Atomos User Config",
                        sub_account_note:"Atomos User Config",
                        sub_account_testnet:traderSubAccountConfig.testnet,
                        sub_account_trader_weight: traderSubAccountConfig.weight,
                        sub_account_sub_link_name: traderSubAccountConfig.sub_link_name
                    });
                }
            }
        }else {
            // User has atomos === true
            // So user as own set traders to copy
            //2. Get All User's Sub Accounts in sub accounts collection
            const getAllSubCollectionsForUser_Cursor = await mongoDatabase.collection.subAccountsCollection.getAllDocumentsBy({
                tg_user_id: user.tg_user_id
            });

            // Get the Sub Accounts present in user's bybit
            const getSubUIDList_Res = await bybit.clients.bybit_RestClientV5.getSubUIDList();
            if(getSubUIDList_Res.retCode!==0)throw new Error(getSubUIDList_Res.retMsg);
            const subAccountsPresentInUserBybitAccount_Array = getSubUIDList_Res.result.subMembers;
            // Loop through the User SubCollections and check if it exists in bybit: If does not exist create it. 
            let counter = 0;// Counts how many subAccountsCollection documents were got from db
            while(await getAllSubCollectionsForUser_Cursor.hasNext()){
                const subCollectionDocument = await getAllSubCollectionsForUser_Cursor.next();
                counter+=1;

                let subAcccountAlreadyCreated = false;
                subAccountsPresentInUserBybitAccount_Array.forEach((subMember)=>{
                    if(subMember.username===subCollectionDocument.sub_account_username){
                        if(subMember.status!==bybit.SUB_ACCOUNTS_STATUS.NORMAL){
                            throw new Error(`Sub Account (${subCollectionDocument.sub_account_username}) is present in user:(${user.username} userId:(${user.tg_user_id}) but the subAccount status is :(${subMember.status}) not normal)`);
                        }else {
                            // Sub Account found in user's account
                            subAcccountAlreadyCreated = true;
                        }
                    }
                });

                // Create Sub Account in users bybit a/c
                if(subAcccountAlreadyCreated===false){
                    // create sub Account
                    await createSubAccount_itsApi_andSaveInDB({
                        bybit,mongoDatabase,trader,user,
                        sub_account_api_note: "Atomos User Config",
                        sub_account_note:"Atomos User Config",
                        sub_account_testnet:subCollectionDocument.testnet,
                        sub_account_trader_weight: subCollectionDocument.weight,
                        sub_account_sub_link_name: subCollectionDocument.sub_link_name
                    });
                    // delete the preevious sub account
                    await mongoDatabase.collection.subAccountsCollection.deleteManyDocumentsByIds([subCollectionDocument._id]);

                    
                }


            }
            // END OF WHILE LOOP

            if(counter===0)throw new Error(`User: (${user.username}) as atomos set to true but has no subAccount saved in subAccountsCollecction`);

        }
        
        return;
        
    }catch(error){
        const newErrorMessage = `(user:${user.tg_user_id}) (fn:createSubAccountsForUserIfNotCreated):${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};




/**
 * @param {{
 *      bybit: import("../../Trader").Bybit,
 *      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
 *      trader: import("../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface,
 *      user: import("../../MongoDatabase/collections/users/types").Users_Collection_Document_Interface,
 *      sub_account_note: string,
 *      sub_account_api_note: string
 *      sub_account_testnet: boolean,
 *      sub_account_trader_weight: number,
 *      sub_account_sub_link_name: string
 * }} param0
 */
async function createSubAccount_itsApi_andSaveInDB({
    bybit,
    mongoDatabase,
    trader,
    user,
    sub_account_note,
    sub_account_api_note,
    sub_account_testnet,
    sub_account_trader_weight,
    sub_account_sub_link_name
}){
    console.log("(fn:createSubAccount_itsApi_andSaveInDB)");
    /**
     * @type {{
     *      uid: string,
     *      username: string,
     *      memberType: number,
     *      status: number,
     *      remark: string
     * }}
     */
    let createdAccount = {};
    let subAccountCreated = false;
    while(subAccountCreated===false){
        const subAccountUsername = bybit.utils.generateRandomUsernameForSubAccount();// randomly generated
        // create the sub Account with the username
        const createSubAccount2_Res = await bybit.clients.bybit_RestClientV5.createSubAccount({
            memberType:bybit.SUB_ACCOUNTS_MEMBER_TYPES.NORMAL_SUB_ACCOUNT,
            username:subAccountUsername,//"APPTEST1",
            note:sub_account_note,//"Atomos Default Config",
            switch: bybit.SUB_ACCOUNT_SWITCH.TURN_ON_QUICK_LOGIN
        });
        console.log(createSubAccount2_Res);
        // If response says that user exists create new username and create new subaccount
        if(createSubAccount2_Res.retCode===0){
            subAccountCreated = true;
            createdAccount = {
                ...createSubAccount2_Res.result
            };
        }else if(createSubAccount2_Res.retCode===31005 || createSubAccount2_Res.retMsg.includes("The user already exists")){
            subAccountCreated = false;
        }else {
            if(createSubAccount2_Res.retCode!==0)throw new Error(createSubAccount2_Res.retMsg);
        }
    }
    
    // Enale SubUID universal Transer
    const enableUniversalTransfer_Res = await bybit.clients.bybit_RestClientV5.enableUniversalTransferForSubAccountsWithUIDs([createdAccount.uid]);
    if(enableUniversalTransfer_Res.retCode!==0)throw new Error(enableUniversalTransfer_Res.retMsg);
    

    // Create Api Key for the Sub Account
    const createSubAccountUIDAPIKey_Res = await bybit.clients.bybit_RestClientV5.createSubAccountUIDAPIKey({
        permissions:{
            ContractTrade:["Order","Position"],
            Derivatives:["DerivativesTrade"],
            Wallet:["AccountTransfer","SubMemberTransferList"],
            Exchange:["ExchangeHistory"]

        },
        readOnly: bybit.API_KEYS_READ_ONLY_MODES.READ_AND_WRITE,//Read and Write
        subuid: createdAccount.uid,
        note: sub_account_api_note,//"Atomos Default Config"
    });
    if(createSubAccountUIDAPIKey_Res.retCode!==0)throw new Error(createSubAccountUIDAPIKey_Res.retMsg);

    // Save the Info About the created SUB ACCOUNT in SubAccountsCollection
    const createNewDocument_Res = await mongoDatabase.collection.subAccountsCollection.createNewDocument({
        sub_account_username: createdAccount.username,
        tg_user_id: user.tg_user_id,
        trader_username: trader.username,
        weight: sub_account_trader_weight,
        private_api: createSubAccountUIDAPIKey_Res.result.secret,
        puplic_api: createSubAccountUIDAPIKey_Res.result.apiKey,
        trader_uid: trader.uid,
        testnet: sub_account_testnet,
        sub_account_uid: Number(createdAccount.uid),
        sub_link_name: sub_account_sub_link_name
    });

    if(createNewDocument_Res.acknowledged===false)throw new Error(`Error writing to subAccountsCollection: new Sub Account saving name:${createdAccount.username} user:(${user.username})`);
}