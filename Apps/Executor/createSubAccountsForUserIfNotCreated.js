

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
        // 1. Check if user has atomos set to true or false
        const userIsAtomos = user.atomos||false;
        // if userIsAtomos set sub accounts based on user selection
        // if not userIsAtomos set sub collection based on default
        if(!userIsAtomos){
            // set sub accounts based on default sub accounts config
            const subAccountsConfig_Cursor = await mongoDatabase.collection.subAccountsConfigCollection.getAllDocuments();
            const subAccountsConfig_documents_Array = await subAccountsConfig_Cursor.toArray();
            if(subAccountsConfig_documents_Array.length===0)throw new Error("Sub_Account_Config collection: No documentt found in collection. Collection must have a sub account config document ");
            // Check that the sub accounts listed in the subAccountConfig have been created in user account and if not create the sub accounts
            const getSubUIDList_Res = await bybit.clients.bybit_RestClientV5.getSubUIDList();
            if(getSubUIDList_Res.retCode!==0)throw new Error(getSubUIDList_Res.retMsg);

            const subAccountsPresentInUserBybitAccount_Array = getSubUIDList_Res.result.subMembers;
            // const userNamesOfSubAccountsFromSubAccountsConfig = Object.keys(subAccountsConfig);
            for(const subAccountConfig of subAccountsConfig_documents_Array){
                let subAcccountAlreadyCreated = false;
                const subAccountNameFromConfig = subAccountConfig.sub_account_name;
                subAccountsPresentInUserBybitAccount_Array.forEach((subMember)=>{
                    if(subMember.username===subAccountNameFromConfig){
                        if(subMember.status!==bybit.SUB_ACCOUNTS_STATUS.NORMAL){
                            throw new Error(`Sub Account (${subAccountNameFromConfig}) is present in user:(${user.username} userId:(${user.tg_user_id}) but the subAccount status is :(${subMember.status}) not normal)`);
                        }else {
                            // Sub Account found in user's account
                            subAcccountAlreadyCreated = true;
                        }
                    }
                });
                if(subAcccountAlreadyCreated===false){
                    // create the sub Account with the username
                    const createSubAccount2_Res = await bybit.clients.bybit_RestClientV5.createSubAccount({
                        memberType:bybit.SUB_ACCOUNTS_MEMBER_TYPES.NORMAL_SUB_ACCOUNT,
                        username:subAccountNameFromConfig,//"APPTEST1",
                        note:"Atomos Default Config",
                        switch: bybit.SUB_ACCOUNT_SWITCH.TURN_ON_QUICK_LOGIN
                    });
                    if(createSubAccount2_Res.retCode!==0)throw new Error(createSubAccount2_Res.retMsg);
                    // Enale SubUID universal Transer
                    const enableUniversalTransfer_Res = await bybit.clients.bybit_RestClientV5.enableUniversalTransferForSubAccountsWithUIDs([createSubAccount2_Res.result.uid]);
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
                        subuid: createSubAccount2_Res.result.uid,
                        note: "Atomos Default Config"
                    });
                    if(createSubAccountUIDAPIKey_Res.retCode!==0)throw new Error(createSubAccountUIDAPIKey_Res.retMsg);

                    // Save the Info About the created SUB ACCOUNT in SubAccountsCollection
                    const createNewDocument_Res = await mongoDatabase.collection.subAccountsCollection.createNewDocument({
                        name: createSubAccount2_Res.result.username,
                        tg_user_id: user.tg_user_id,
                        trader_username: trader.username,
                        weight: subAccountConfig.weight,
                        private_api: createSubAccountUIDAPIKey_Res.result.secret,
                        puplic_api: createSubAccountUIDAPIKey_Res.result.apiKey,
                        trader_uid: trader.uid,
                        testnet: subAccountConfig.testnet,
                        sub_account_uid: createSubAccount2_Res.result.uid
                    });

                    if(createNewDocument_Res.acknowledged===false)throw new Error(`Error writing to subAccountsCollection: new Sub Account saving name:${subAccountNameFromConfig} user:(${user.username})`);


                    
                }
            }

        }else {
            // User has atomos === true
            // So user as own set traders to copy
            //2. Get user's subAcccounts from SubAccountColection and check if the subAccounts exist in user's bbit account
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
                    if(subMember.username===subCollectionDocument.name){
                        if(subMember.status!==bybit.SUB_ACCOUNTS_STATUS.NORMAL){
                            throw new Error(`Sub Account (${subCollectionDocument.name}) is present in user:(${user.username} userId:(${user.tg_user_id}) but the subAccount status is :(${subMember.status}) not normal)`);
                        }else {
                            // Sub Account found in user's account
                            subAcccountAlreadyCreated = true;
                        }
                    }
                });

                // Create Sub Account in users bybit a/c
                if(subAcccountAlreadyCreated===false){
                    // create the sub Account with the username
                    const createSubAccount2_Res = await bybit.clients.bybit_RestClientV5.createSubAccount({
                        memberType:bybit.SUB_ACCOUNTS_MEMBER_TYPES.NORMAL_SUB_ACCOUNT,
                        username:subCollectionDocument.name,//"APPTEST1",
                        note:"Atomos User Config",
                        switch: bybit.SUB_ACCOUNT_SWITCH.TURN_ON_QUICK_LOGIN
                    });
                    if(createSubAccount2_Res.retCode!==0)throw new Error(createSubAccount2_Res.retMsg);

                    // Enale SubUID universal Transer
                    const enableUniversalTransfer_Res = await bybit.clients.bybit_RestClientV5.enableUniversalTransferForSubAccountsWithUIDs([createSubAccount2_Res.result.uid]);
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
                        subuid: createSubAccount2_Res.result.uid,
                        note: "Atomos User Config"
                    });
                    if(createSubAccountUIDAPIKey_Res.retCode!==0)throw new Error(createSubAccountUIDAPIKey_Res.retMsg);
                    

                    // Save the Info About the created SUB ACCOUNT in SubAccountsCollection
                    const createNewDocument_Res = await mongoDatabase.collection.subAccountsCollection.createNewDocument({
                        name: createSubAccount2_Res.result.username,
                        tg_user_id: user.tg_user_id,
                        trader_username: trader.username,
                        weight: subCollectionDocument.weight,
                        private_api: createSubAccountUIDAPIKey_Res.result.secret,
                        puplic_api: createSubAccountUIDAPIKey_Res.result.apiKey,
                        trader_uid: trader.uid,
                        testnet: subCollectionDocument.testnet,
                        sub_account_uid: createSubAccount2_Res.result.uid
                    });

                    if(createNewDocument_Res.acknowledged===false)throw new Error(`Error writing to subAccountsCollection: new Sub Account saving name:${subCollectionDocument.name} user:(${user.username})`);


                    
                }


            }
            // END OF WHILE LOOP

            if(counter===0)throw new Error(`User: (${user.username}) as atomos set to true but has no subAccount saved in subAccountsCollecction`);

        }
        
        return;
        
    }catch(error){
        const newErrorMessage = `(fn:createSubAccountsForUserIfNotCreated):${error.message}`;
        throw new Error(newErrorMessage);
    }
};



