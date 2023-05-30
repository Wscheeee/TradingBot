//@ts-check
/***
 * APP :
 * -------
 * Runs 
 * :-when configs change : Update and Delete
 * : 
 */



const { MongoDatabase , SubAccountsConfigCollectionStateDetector} = require("../../MongoDatabase");

const {sleepAsync} = require("../../Utils/sleepAsync");
const { readAndConfigureDotEnv } = require("../../Utils/readAndConfigureDotEnv");
const {Logger} = require("../../Logger");
const {Telegram} = require("../../Telegram");

// local
const {closeAllPositionsInASubAccount} = require("./closeAllPositionsInASubAccount");
const {transferAllUSDTBalanceFromSubAccountToMainAccount} = require("./transferAllUSDTBalanceFromSubAccountToMainAccount");

const APP_NAME = "App:SubAccountConfigStates_Handler";
const logger = new Logger({app_name:APP_NAME});
const {IS_LIVE} = require("../../appConfig");
const { DateTime } = require("../../DateTime");
const { Bybit } = require("../../Trader");
const { closePositionsForTraderWhenTraderIsRemovedFromSubAccountConfig } = require("./closePositionsForTraderWhenTraderIsRemovedFromSubAccountConfig");
const { updateSubAccountDocumentsToUpdatedSubAccountConfigData } = require("./updateSubAccountDocumentsToUpdatedSubAccountConfigData");
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE);
process.env.TZ = dotEnvObj.TZ;





(async () => {
    /**
     * @type {MongoDatabase|null}
     */ 
    let mongoDatabase = null;
    let interval = null;
    try {
        
        logger.info("Start App");
        /***
		 * Error Telegram bot for sendding error messages to Telegram error channel.
		 */
        const errorbot = new Telegram({telegram_bot_token:dotEnvObj.TELEGRAM_BOT_TOKEN,requestDelay:2000});
        logger.info("Create Telegrambot");
        logger.addLogCallback("error",async (cbIndex,message)=>{
            await errorbot.sendMessage(dotEnvObj.TELEGRAM_ERROR_CHHANNEL_ID,message);
            logger.info("Send error message to telegram error channel");
        });



        logger.info("Create Bybit Client");
      
        console.log(dotEnvObj);
        mongoDatabase = new MongoDatabase(dotEnvObj.DATABASE_URI);
        if(!mongoDatabase)throw new Error("Error creating mongoDatabase");
        logger.info("Create DB");
        await mongoDatabase.connect(dotEnvObj.DATABASE_NAME);
        logger.info("Connect DB");

        //////////////////////////////////
        // SUB ACCOUNTS CONFIG COLLECTION
        const subAccountsConfigCollectionStateDetector = new SubAccountsConfigCollectionStateDetector({ mongoDatabase: mongoDatabase });
        logger.info("Create SubAccountsConfigCollectionStateDetector and set listeners");
        subAccountsConfigCollectionStateDetector.onUpdateDocument(async (configDocumentBeforeUpdate,configDocumentAfterUpdate)=>{
            try{
                logger.info(`subAcccountConfig.onUpdateDocument b4:${JSON.stringify(configDocumentBeforeUpdate)}${JSON.stringify(configDocumentAfterUpdate)}`);
                if(!mongoDatabase)return;
                
                // Check if the trader uid has changed
                // If trader uid has changed : close the trader's positions for each trader
                if(configDocumentBeforeUpdate.trader_uid!==configDocumentAfterUpdate.trader_uid && !!configDocumentBeforeUpdate.sub_link_name && !!configDocumentBeforeUpdate.trader_uid){
                    //trader uid changed
                    // await closeAllPositionsInAnAccountAndTransferTheBalanceToMainAccount({
                    //     mongoDatabase,
                    //     sub_link_name:configDocumentBeforeUpdate.sub_link_name,
                    //     trader_uid:configDocumentBeforeUpdate.trader_uid
                    // });

                    await closePositionsForTraderWhenTraderIsRemovedFromSubAccountConfig({
                        mongoDatabase,
                        trader_uid:configDocumentBeforeUpdate.trader_uid
                    });

                    await updateSubAccountDocumentsToUpdatedSubAccountConfigData({
                        mongoDatabase,
                        previous_trader_uid:configDocumentBeforeUpdate.trader_uid,
                        updatedSubAccountConfigDocument:configDocumentAfterUpdate
                    });
                   
                    
                }
            }catch(e){
                logger.error(`subAcccountConfig.onCreateDocument ${e.message}`);
            }
        });
        subAccountsConfigCollectionStateDetector.onDeleteDocumentCallbacks(async (deletedConfigDocument)=>{
            try{
                logger.info(`subAcccountConfig.onDeleteDocumentCallbacks deletedConfigDocument:${JSON.stringify(deletedConfigDocument)}`);
                if(!mongoDatabase)return;
                if(!!deletedConfigDocument.sub_link_name && !!deletedConfigDocument.trader_uid){
                    // await closeAllPositionsInAnAccountAndTransferTheBalanceToMainAccount({
                    //     mongoDatabase,
                    //     sub_link_name:deletedConfigDocument.sub_link_name,
                    //     trader_uid:deletedConfigDocument.trader_uid
                    // });
                    await closePositionsForTraderWhenTraderIsRemovedFromSubAccountConfig({
                        mongoDatabase,
                        trader_uid:deletedConfigDocument.trader_uid
                    });
                    await updateSubAccountDocumentsToUpdatedSubAccountConfigData({
                        mongoDatabase,
                        previous_trader_uid:deletedConfigDocument.trader_uid,
                        updatedSubAccountConfigDocument:null
                    });
                }
                

            }catch(e){
                logger.error(`subAcccountConfig.onDeleteDocumentCallbacks ${e.message}`);
            }
        });

        
        subAccountsConfigCollectionStateDetector.listenToSubAccountsConfigCollection();
        logger.info("Set subAccountsConfigCollectionStateDetector.listenToSubAccountsConfigCollection");
        //////////////////////////////////


      
    }catch(error){
        if(interval){
            clearInterval(interval);
        }
        if(mongoDatabase){
            await mongoDatabase.disconnect();
        }
        logger.error(JSON.stringify(error.message));
        await sleepAsync(5000);
        // throw error;
    }  
})();




/**
 * 
 * @param {{
 *   mongoDatabase: import("../../MongoDatabase").MongoDatabase
 *   sub_link_name:string,
 *    trader_uid: string
* }} param0 
 */
async function closeAllPositionsInAnAccountAndTransferTheBalanceToMainAccount({mongoDatabase,sub_link_name,trader_uid}){
    try{
        console.log("(fn:deletedConfigDocument)");
        // loop through all users
        const users_Cursor = await mongoDatabase.collection.usersCollection.getAllDocuments();
        while(await users_Cursor.hasNext()){
            const userDocument = await users_Cursor.next();
            if(!userDocument)return;
            console.log({username:userDocument.username});
            // if(userDocument.username!="Speet") continue;
            // console.log("IIs Speet continue:");
            
            // Get the sub acccount
            const subAccountDocument_Cursor = await mongoDatabase.collection.subAccountsCollection.getAllDocumentsBy({
                sub_link_name:sub_link_name,
                testnet: userDocument.testnet,
                tg_user_id: userDocument.tg_user_id,
                trader_uid: trader_uid
            });
            while(await subAccountDocument_Cursor.hasNext()){
                const subAccountDocument = await subAccountDocument_Cursor.next();
                console.log({subAccountDocument});
                if(!subAccountDocument){
                    logger.info(`subAccount not found for configDocumentBeforeUpdate: ${JSON.stringify({sub_link_name,trader_uid})}`);
                    return;
                }

    
                const masterBybit = new Bybit({
                    millisecondsToDelayBetweenRequests: 5000,
                    privateKey: userDocument.privateKey,
                    publicKey: userDocument.publicKey,
                    testnet: userDocument.testnet===true?true:false
                });
                const subAccountBybit  = new Bybit({
                    millisecondsToDelayBetweenRequests: 5000,
                    privateKey: subAccountDocument.private_api,
                    publicKey: subAccountDocument.public_api,
                    testnet: subAccountDocument.testnet===true?true:false
                });
                await closeAllPositionsInASubAccount({
                    bybit: subAccountBybit
                });
    
    
                // Get master account info
                const getMasterAccountAPIKeyInfo_Res = await masterBybit.clients.bybit_AccountAssetClientV3.getAPIKeyInformation();
                // console.log(getMasterAccountAPIKeyInfo_Res);
                //@ts-ignore
                if(getMasterAccountAPIKeyInfo_Res.retCode!==0)throw new Error("getMasterAccountAPIKeyInfo_Res: "+getMasterAccountAPIKeyInfo_Res.retMsg);
        
                await transferAllUSDTBalanceFromSubAccountToMainAccount({
                    master_acccount_uid: Number(getMasterAccountAPIKeyInfo_Res.result.userID),
                    masterAccount_bybit: masterBybit,
                    sub_account_uid: subAccountDocument.sub_account_uid,
                    subAccount_bybit: subAccountBybit,
    
                });
            }

            
        }
    }catch(error){
        const newErrorMessage = `(fn:deletedConfigDocument) ${error.message}`;
        error.message = newErrorMessage;
        console.log(error);
        logger.error(error.message);
    }
}

