
//@ts-check

/**
 * @param {{
 *      user: import("../../MongoDatabase/collections/users/types").Users_Collection_Document_Interface,
 *      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
 *      bybit: import("../../Trader").Bybit
 * }} param0
 */
module.exports.createSubAccountsForUserIfNotCreated = async function createSubAccountsForUserIfNotCreated({
    mongoDatabase,user,bybit
}){
    try {
        console.log("(ffn:createSubAccountsForUserIfNotCreated)");
        // 1. Check if user has atomos set to true or false
        const userIsAtomos = user.atomos||false;
        // if userIsAtomos set sub accounts based on user selection
        // if not userIsAtomos set sub collection based on default
        if(userIsAtomos===false){
            const getAllSubCollectionsForUser_Cursor = await mongoDatabase.collection.subAccountsCollection.getAllDocumentsBy({
                tg_user_id: user.tg_user_id,
                testnet: user.testnet
            });
            const allSubCollectionsForUser_Array = await getAllSubCollectionsForUser_Cursor.toArray();

            // Get sub acccounts Configs
            // const subAccountsConfig_Cursor = await mongoDatabase.collection.subAccountsConfigCollection.getAllDocuments();
            const subAccountsConfig_documents_Array = user.custom_sub_account_configs;//await subAccountsConfig_Cursor.toArray();
            if(subAccountsConfig_documents_Array.length===0)throw new Error("Sub_Account_Config collection: No documentt found in collection. Collection must have a sub account config document ");

            // Get Existing Sub Accounts on Bybit 
            const getSubUIDList_Res = await bybit.clients.bybit_RestClientV5.getSubUIDList();
            if(getSubUIDList_Res.retCode!==0)throw new Error("getSubUIDList_Res: "+getSubUIDList_Res.retMsg);
            const subAccountsPresentInUserBybitAccount_Array = getSubUIDList_Res.result.subMembers;
            console.log({subAccountsPresentInUserBybitAccount_Array});
            // Check that Sub Accounts have been created for sub_link_name listed in the SubAccountsConfig
            for(const traderSubAccountConfig of subAccountsConfig_documents_Array){
                const subAcccountWithSubLinkNameInConfigIsPresentInSubAccountsCollection = allSubCollectionsForUser_Array.find((doc)=>doc.sub_link_name===traderSubAccountConfig.sub_link_name);
                console.log({subAcccountWithSubLinkNameInConfigIsPresentInSubAccountsCollection});
                if(subAcccountWithSubLinkNameInConfigIsPresentInSubAccountsCollection){
                    // trader sub account info is already savedd in subaccounts collection
                    // Check that the sub account uid matches any of the eisting sub accounts on bybit
                    const subAccountInBybit = subAccountsPresentInUserBybitAccount_Array.find((subMemberV5)=> (
                        subMemberV5.username===subAcccountWithSubLinkNameInConfigIsPresentInSubAccountsCollection.sub_account_username &&
                        subMemberV5.uid===String(subAcccountWithSubLinkNameInConfigIsPresentInSubAccountsCollection.sub_account_uid)
                    ));
                    console.log({subAccountInBybit});
                    if(subAccountInBybit){
                        // If sub Account in Vybit and in SubAccounts Collection but not assigned to a trader assign a trader
                        if(
                            (subAcccountWithSubLinkNameInConfigIsPresentInSubAccountsCollection.trader_uid !== traderSubAccountConfig.trader_uid)||
                            (subAcccountWithSubLinkNameInConfigIsPresentInSubAccountsCollection.trader_username !== traderSubAccountConfig.trader_username)||
                            (subAcccountWithSubLinkNameInConfigIsPresentInSubAccountsCollection.weight !== traderSubAccountConfig.weight)
                            
                        ){
                            // ub Account in collection docs has no trader assigned but subAccounttConfig has a tradder assigned
                            await mongoDatabase.collection.subAccountsCollection.updateDocument(subAcccountWithSubLinkNameInConfigIsPresentInSubAccountsCollection._id,{
                                trader_uid: traderSubAccountConfig.trader_uid,
                                trader_username: traderSubAccountConfig.trader_username,
                                weight: traderSubAccountConfig.weight?Number(traderSubAccountConfig.weight):0,
                            });
                        }else {
                            console.log("Sub Accountt set and ready"); 
                        }
                    }else {
                        // Meaning that trader sub account found in sub accounts collection but not found in bybit subaccounts
                        // Meaning we need to create the subaccount in bybit but then update the existing document in sub account collection
                        // create sub Account and update the sub accounts document
                        await createSubAccount_itsApi_andUpdateInDB({
                            bybit,mongoDatabase,
                            sub_account_api_note: "Atomos User Config",
                            sub_account_note: "Atomos User Config",
                            sub_account_document: subAcccountWithSubLinkNameInConfigIsPresentInSubAccountsCollection,
                            trader:traderSubAccountConfig.trader_uid? await mongoDatabase.collection.topTradersCollection.findOne({uid: traderSubAccountConfig.trader_uid}):null,
                            user
                        });
                    }
                }else {
                    // Meaning that trader sub account info not found in sub accounts collection
                    // create sub Account
                    await createSubAccount_itsApi_andSaveInDB({
                        bybit,mongoDatabase,
                        trader: traderSubAccountConfig.trader_uid? await mongoDatabase.collection.topTradersCollection.findOne({uid: traderSubAccountConfig.trader_uid}) : null,
                        user,
                        sub_account_api_note: "Atomos User Config",
                        sub_account_note:"Atomos User Config",
                        sub_account_testnet:user.testnet,//traderSubAccountConfig.testnet,
                        sub_account_trader_weight: traderSubAccountConfig.weight,
                        sub_account_sub_link_name: traderSubAccountConfig.sub_link_name
                    });
                }
            }
        }else {
            // User has atomos === true

            const getAllSubCollectionsForUser_Cursor = await mongoDatabase.collection.subAccountsCollection.getAllDocumentsBy({
                tg_user_id: user.tg_user_id,
                testnet: user.testnet
            });
            const allSubCollectionsForUser_Array = await getAllSubCollectionsForUser_Cursor.toArray();

            // Get sub acccounts Configs
            const subAccountsConfig_Cursor = await mongoDatabase.collection.subAccountsConfigCollection.getAllDocuments();
            const subAccountsConfig_documents_Array = await subAccountsConfig_Cursor.toArray();
            if(subAccountsConfig_documents_Array.length===0)throw new Error("Sub_Account_Config collection: No documentt found in collection. Collection must have a sub account config document ");

            // Get Existing Sub Accounts on Bybit 
            const getSubUIDList_Res = await bybit.clients.bybit_RestClientV5.getSubUIDList();
            if(getSubUIDList_Res.retCode!==0)throw new Error("getSubUIDList_Res: "+getSubUIDList_Res.retMsg);
            const subAccountsPresentInUserBybitAccount_Array = getSubUIDList_Res.result.subMembers;
            console.log({subAccountsPresentInUserBybitAccount_Array});
            // Check that Sub Accounts have been created for sub_link_name listed in the SubAccountsConfig
            for(const traderSubAccountConfig of subAccountsConfig_documents_Array){
                const subAcccountWithSubLinkNameInConfigIsPresentInSubAccountsCollection = allSubCollectionsForUser_Array.find((doc)=>doc.sub_link_name===traderSubAccountConfig.sub_link_name);
                console.log({subAcccountWithSubLinkNameInConfigIsPresentInSubAccountsCollection});
                if(subAcccountWithSubLinkNameInConfigIsPresentInSubAccountsCollection){
                    // trader sub account info is already savedd in subaccounts collection
                    // Check that the sub account uid matches any of the eisting sub accounts on bybit
                    const subAccountInBybit = subAccountsPresentInUserBybitAccount_Array.find((subMemberV5)=> (
                        subMemberV5.username===subAcccountWithSubLinkNameInConfigIsPresentInSubAccountsCollection.sub_account_username &&
                        subMemberV5.uid===String(subAcccountWithSubLinkNameInConfigIsPresentInSubAccountsCollection.sub_account_uid)
                    ));
                    console.log({subAccountInBybit});
                    if(subAccountInBybit){
                        // If sub Account in Bybit and in SubAccounts Collection but not assigned to a trader assign a trader
                        if(
                            (subAcccountWithSubLinkNameInConfigIsPresentInSubAccountsCollection.trader_uid !== traderSubAccountConfig.trader_uid) || 
                            (subAcccountWithSubLinkNameInConfigIsPresentInSubAccountsCollection.trader_username!== traderSubAccountConfig.trader_username) || 
                            (subAcccountWithSubLinkNameInConfigIsPresentInSubAccountsCollection.weight !== traderSubAccountConfig.weight)
                        ){
                            // ub Account in collection docs has no trader assigned but subAccounttConfig has a tradder assigned
                            await mongoDatabase.collection.subAccountsCollection.updateDocument(subAcccountWithSubLinkNameInConfigIsPresentInSubAccountsCollection._id,{
                                trader_uid: traderSubAccountConfig.trader_uid,
                                trader_username: traderSubAccountConfig.trader_username,
                                weight: traderSubAccountConfig.weight?Number(traderSubAccountConfig.weight):0,
                            });
                        }else {
                            console.log("Sub Accountt set and ready"); 
                        }
                    }else {
                        // Meaning that trader sub account found in sub accounts collection but not found in bybit subaccounts
                        // Meaning we need to create the subaccount in bybit but then update the existing document in sub account collection
                        // create sub Account and update the sub accounts document
                        await createSubAccount_itsApi_andUpdateInDB({
                            bybit,mongoDatabase,
                            sub_account_api_note: "Atomos User Config",
                            sub_account_note: "Atomos User Config",
                            sub_account_document: subAcccountWithSubLinkNameInConfigIsPresentInSubAccountsCollection,
                            trader:traderSubAccountConfig.trader_uid? await mongoDatabase.collection.topTradersCollection.findOne({uid: traderSubAccountConfig.trader_uid}):null,
                            user
                        });
                    }
                }else {
                    // Meaning that trader sub account info not found in sub accounts collection
                    // create sub Account
                    await createSubAccount_itsApi_andSaveInDB({
                        bybit,mongoDatabase,
                        trader: traderSubAccountConfig.trader_uid? await mongoDatabase.collection.topTradersCollection.findOne({uid: traderSubAccountConfig.trader_uid}) : null,
                        user,
                        sub_account_api_note: "Atomos User Config",
                        sub_account_note:"Atomos User Config",
                        sub_account_testnet:user.testnet,//traderSubAccountConfig.testnet,
                        sub_account_trader_weight: traderSubAccountConfig.weight,
                        sub_account_sub_link_name: traderSubAccountConfig.sub_link_name
                    });
                }
            }

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
 *      trader: import("../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface|null,
 *      user: import("../../MongoDatabase/collections/users/types").Users_Collection_Document_Interface,
 *      sub_account_note: string,
 *      sub_account_api_note: string
 *      sub_account_testnet: boolean,
 *      sub_account_trader_weight: number,
 *      sub_account_sub_link_name: string,
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
    //@ts-ignore
    let createdAccount = {};
    let subAccountCreated = false;
    while(subAccountCreated===false){
        
        const subAccountUsername = bybit.utils.generateRandomUsernameForSubAccount(sub_account_sub_link_name);// randomly generated
        // create the sub Account with the username
        const createSubAccount2_Res = await bybit.clients.bybit_RestClientV5.createSubAccount({
            //@ts-ignore
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
        }else if(createSubAccount2_Res.retCode===31005 || createSubAccount2_Res.retMsg.includes("createSubAccount2_Res: The user already exists")){
            subAccountCreated = false;
        }else {
            if(createSubAccount2_Res.retCode!==0)throw new Error(createSubAccount2_Res.retMsg);
        }
    }
    if(!createdAccount.uid)throw new Error("Error creating sub account: createdAccount object has no required filed uid: createdAccount:"+JSON.stringify(createdAccount));
    
 

    // Create Api Key for the Sub Account
    const createSubAccountUIDAPIKey_Res = await bybit.clients.bybit_RestClientV5.createSubAccountUIDAPIKey({
        permissions:{
            ContractTrade:["Order","Position"],
            Derivatives:["DerivativesTrade"],
            Wallet:["AccountTransfer","SubMemberTransferList"],
            Exchange:["ExchangeHistory"]

        },
        //@ts-ignore
        readOnly: bybit.API_KEYS_READ_ONLY_MODES.READ_AND_WRITE,//Read and Write
        //@ts-ignore
        subuid: createdAccount.uid,
        note: sub_account_api_note,//"Atomos Default Config"
    });
    if(createSubAccountUIDAPIKey_Res.retCode!==0)throw new Error(createSubAccountUIDAPIKey_Res.retMsg);

    // Enale SubUID universal Transer After creating API keys
    // const enableUniversalTransfer_Res = await bybit.clients.bybit_RestClientV5.enableUniversalTransferForSubAccountsWithUIDs([createdAccount.uid]);
    // if(enableUniversalTransfer_Res.retCode!==0)throw new Error("enableUniversalTransfer_Res: "+enableUniversalTransfer_Res.retMsg);
    
    const SubAccount = bybit.createNewBybitSubClass();
    const subAccount =  new SubAccount({
        millisecondsToDelayBetweenRequests:0,
        privateKey:createSubAccountUIDAPIKey_Res.result.secret,
        publicKey: createSubAccountUIDAPIKey_Res.result.apiKey,
        testnet: user.testnet
    });
    const upgradeToUnifiedAccount_Res = await subAccount.clients.bybit_RestClientV5.upgradeToUnifiedAccount();
    if(upgradeToUnifiedAccount_Res.retCode!==0){
        throw  new Error("upgradeToUnifiedAccount_Res: "+upgradeToUnifiedAccount_Res.retMsg);
    }

    // create new sub_account_document
    // Save the Info About the created SUB ACCOUNT in SubAccountsCollection
    const doc = await mongoDatabase.collection.subAccountsCollection.findOne({
        testnet: sub_account_testnet,
        tg_user_id: user.tg_user_id,
        sub_link_name: sub_account_sub_link_name,
    }); 
    if(doc){
        await mongoDatabase.collection.subAccountsCollection.updateDocument(doc._id,{
            sub_account_username: createdAccount.username, 
            tg_user_id: user.tg_user_id,
            trader_username: trader?trader.username:"",
            weight: sub_account_trader_weight,
            private_api: createSubAccountUIDAPIKey_Res.result.secret,
            public_api: createSubAccountUIDAPIKey_Res.result.apiKey,
            trader_uid: trader?trader.uid:"",
            testnet: sub_account_testnet,
            sub_account_uid: String(createdAccount.uid),
            sub_link_name: sub_account_sub_link_name,
            document_created_at_datetime: new Date(),
            //@ts-ignore
            server_timezone: process.env.TZ
        });
    }else {
        const createNewDocument_Res = await mongoDatabase.collection.subAccountsCollection.createNewDocument({
            sub_account_username: createdAccount.username, 
            tg_user_id: user.tg_user_id,
            trader_username: trader?trader.username:"",
            weight: sub_account_trader_weight,
            private_api: createSubAccountUIDAPIKey_Res.result.secret,
            public_api: createSubAccountUIDAPIKey_Res.result.apiKey,
            trader_uid: trader?trader.uid:"",
            testnet: sub_account_testnet,
            sub_account_uid: String(createdAccount.uid),
            sub_link_name: sub_account_sub_link_name,
            document_created_at_datetime: new Date(),
            //@ts-ignore
            server_timezone: process.env.TZ
        });
    
        if(createNewDocument_Res.acknowledged===false)throw new Error(`Error writing to subAccountsCollection: new Sub Account saving name:${createdAccount.username} user:(${user.username})`);

    }
}

/**
 * @param {{
*      bybit: import("../../Trader").Bybit,
*      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
*      trader: import("../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface|null,
*      user: import("../../MongoDatabase/collections/users/types").Users_Collection_Document_Interface,
*      sub_account_document: import("../../MongoDatabase/collections/sub_accounts/types/index").Sub_Account_Collection_Document_Interface|null
*      sub_account_note: string,
*      sub_account_api_note: string
* }} param0
*/
async function createSubAccount_itsApi_andUpdateInDB({
    bybit,
    mongoDatabase,
    trader,
    user,
    sub_account_note,
    sub_account_api_note,
    sub_account_document
}){
    console.log("(fn:createSubAccount_itsApi_andUpdateInDB)");
    /**
     * @type {{
     *      uid: string,
     *      username: string,
     *      memberType: number,
     *      status: number,
     *      remark: string
     * }}
     */
    //@ts-ignore
    let createdAccount = {};
    let subAccountCreated = false;
    while(subAccountCreated===false){
        const subAccountUsername = bybit.utils.generateRandomUsernameForSubAccount(sub_account_document?sub_account_document.sub_link_name:"");// randomly generated
        // create the sub Account with the username
        const createSubAccount2_Res = await bybit.clients.bybit_RestClientV5.createSubAccount({
            //@ts-ignore
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
        }else if(createSubAccount2_Res.retCode===31005 || createSubAccount2_Res.retMsg.includes("createSubAccount2_Res: The user already exists")){
            subAccountCreated = false;
        }else {
            if(createSubAccount2_Res.retCode!==0)throw new Error("createSubAccount2_Res: "+createSubAccount2_Res.retMsg);
        }
    }

    if(!createdAccount.uid)throw new Error("Error creating sub account: createdAccount object has no required filed uid: createdAccount:"+JSON.stringify(createdAccount));
    

    // Create Api Key for the Sub Account
    const createSubAccountUIDAPIKey_Res = await bybit.clients.bybit_RestClientV5.createSubAccountUIDAPIKey({
        permissions:{
            ContractTrade:["Order","Position"],
            Derivatives:["DerivativesTrade"],
            Wallet:["AccountTransfer","SubMemberTransferList"],
            Exchange:["ExchangeHistory"]

        }, 
        //@ts-ignore
        readOnly: bybit.API_KEYS_READ_ONLY_MODES.READ_AND_WRITE,//Read and Write
        subuid: Number(createdAccount.uid),
        note: sub_account_api_note,//"Atomos Default Config"
    });
    if(createSubAccountUIDAPIKey_Res.retCode!==0)throw new Error(createSubAccountUIDAPIKey_Res.retMsg);
    console.log("API kes created");
    if(!sub_account_document ||!sub_account_document._id)throw new Error("error in sub_account_document:"+JSON.stringify(sub_account_document));

    // Enale SubUID universal Transer
    // const enableUniversalTransfer_Res = await bybit.clients.bybit_RestClientV5.enableUniversalTransferForSubAccountsWithUIDs([createdAccount.uid]);
    // if(enableUniversalTransfer_Res.retCode!==0)throw new Error("enableUniversalTransfer_Res: "+enableUniversalTransfer_Res.retMsg);
    
    const SubAccount = bybit.createNewBybitSubClass();
    const subAccount =  new SubAccount({
        millisecondsToDelayBetweenRequests:0,
        privateKey:createSubAccountUIDAPIKey_Res.result.secret,
        publicKey: createSubAccountUIDAPIKey_Res.result.apiKey,
        testnet: user.testnet
    });
    const upgradeToUnifiedAccount_Res = await subAccount.clients.bybit_RestClientV5.upgradeToUnifiedAccount();
    if(upgradeToUnifiedAccount_Res.retCode!==0){
        throw  new Error("upgradeToUnifiedAccount_Res: "+upgradeToUnifiedAccount_Res.retMsg);
    }
    //update
    const updateDocument_Res = await mongoDatabase.collection.subAccountsCollection.updateDocument(sub_account_document._id,{
        sub_account_username: createdAccount.username,
        tg_user_id: user.tg_user_id,
        trader_username: trader?trader.username:"",
        weight: sub_account_document.weight,
        private_api: createSubAccountUIDAPIKey_Res.result.secret,
        public_api: createSubAccountUIDAPIKey_Res.result.apiKey,
        trader_uid: trader?trader.uid:"",
        testnet: sub_account_document.testnet,
        sub_account_uid: String(createdAccount.uid),
        sub_link_name: sub_account_document.sub_link_name
    });
    if(updateDocument_Res.acknowledged===false)throw new Error(`Error updating to subAccountsCollection: update Sub Account saving name:${createdAccount.username} user:(${user.username})`);
    
}