//@ts-check
/***
 * APP :
 * -------
 * Runs 
 * :-when configs change : Update and Delete
 * : 
 */



const { MongoDatabase , SubAccountsConfigCollectionStateDetector, UsersCollectionStateDetector} = require("../../MongoDatabase");

const {sleepAsync} = require("../../Utils/sleepAsync");
const { readAndConfigureDotEnv } = require("../../Utils/readAndConfigureDotEnv");
const {Logger} = require("../../Logger");
const {Telegram} = require("../../Telegram");



const APP_NAME = "App:SubAccountConfigStates_Handler";
const logger = new Logger({app_name:APP_NAME});
const {IS_LIVE} = require("../../appConfig");
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
        const errorbot = new Telegram({telegram_bot_token:dotEnvObj.TELEGRAM_BOT_TOKEN});
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
                if(configDocumentBeforeUpdate.trader_uid!==configDocumentAfterUpdate.trader_uid){
                    // NOTE: That the previousDocument b4 update might have empty trader details and weight.
                    if(configDocumentBeforeUpdate.trader_uid){
                        await closePositionsForTraderWhenTraderIsRemovedFromSubAccountConfig({
                            mongoDatabase,
                            trader_uid:configDocumentBeforeUpdate.trader_uid,
                            config_type:"atomos"
                        });

                    }
                    

                    
                    
                }
                if(configDocumentBeforeUpdate.sub_link_name){
                    await updateSubAccountDocumentsToUpdatedSubAccountConfigData({
                        mongoDatabase,
                        sub_link_name: configDocumentBeforeUpdate.sub_link_name,
                        updatedSubAccountConfigDocument:configDocumentAfterUpdate
                    });

                }
            }catch(e){
                logger.error(`subAcccountConfig.onUpdateDocument ${e.message}`);
            }
        });
        subAccountsConfigCollectionStateDetector.onDeleteDocumentCallbacks(async (deletedConfigDocument)=>{
            try{
                logger.info(`subAcccountConfig.onDeleteDocumentCallbacks deletedConfigDocument:${JSON.stringify(deletedConfigDocument)}`);
                if(!mongoDatabase)return;
                if(deletedConfigDocument.trader_uid){
                    await closePositionsForTraderWhenTraderIsRemovedFromSubAccountConfig({
                        mongoDatabase,
                        trader_uid:deletedConfigDocument.trader_uid,
                        config_type:"atomos"
                    });

                }

                if(deletedConfigDocument.sub_link_name ){
                    await updateSubAccountDocumentsToUpdatedSubAccountConfigData({
                        mongoDatabase,
                        sub_link_name: deletedConfigDocument.sub_link_name,
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


        


        //////////////////////////////////
        // USERS COLLECTION
        const usersCollectionStateDetector = new UsersCollectionStateDetector({mongoDatabase: mongoDatabase});
        logger.info("Create UsersCollectionStateDetector and set listeners");


        usersCollectionStateDetector.onUserCustomConfigListUpdate(async (userDocumentBeforeUpdate,userDocumentAfterUpdate)=>{
            const FUNCTION_NAME = "(fn:usersCollectionStateDetector.onUserCustomConfigListUpdate)";
            console.log(FUNCTION_NAME);
            try{
                console.log({userDocumentBeforeUpdate,userDocumentAfterUpdate});
                if(!mongoDatabase)return;
                if(userDocumentAfterUpdate.status===false||userDocumentAfterUpdate.atomos==true){
                    throw new Error(`user:${userDocumentAfterUpdate.username} ${userDocumentAfterUpdate.tg_user_id} not subscribed | User not following own custom traders`);
                }// User not subscribed | User not following own custom traders

                if(!userDocumentBeforeUpdate){
                    throw new Error("userDocumentBeforeUpdate is: "+JSON.stringify(userDocumentBeforeUpdate));
                }
                const customSubAccountConfigArray_beforeUpdate = userDocumentBeforeUpdate.custom_sub_account_configs;
                const customSubAccountConfigArray_afterUpdate = userDocumentAfterUpdate.custom_sub_account_configs;
                if(!customSubAccountConfigArray_afterUpdate || customSubAccountConfigArray_afterUpdate.length===0){
                    // turn all sub accounts for user to empty trader and 0 weight
                }
                if(!customSubAccountConfigArray_beforeUpdate || !customSubAccountConfigArray_beforeUpdate){
                    throw new Error("customSubAccountConfigArray_beforeUpdate is: "+JSON.stringify(customSubAccountConfigArray_beforeUpdate) + "and customSubAccountConfigArray_afterUpdate is: "+JSON.stringify(customSubAccountConfigArray_afterUpdate));
                }

                // Loop throughthe config lists and get the respective config
                for(const configDocumentBeforeUpdate of  customSubAccountConfigArray_beforeUpdate){
                    // let configDocumentAfterUpdate = null;
                    for(const configDocumentAfterUpdate of customSubAccountConfigArray_afterUpdate){
                        if(configDocumentBeforeUpdate.sub_link_name===configDocumentAfterUpdate.sub_link_name){
                            // configDocumentAfterUpdate = configDocumentAfterUpdate_;
                            console.log({
                                configDocumentBeforeUpdate,
                                configDocumentAfterUpdate
                            });
                            logger.info(`subAcccountConfig.onUpdateDocument b4:${JSON.stringify(configDocumentBeforeUpdate)}${JSON.stringify(configDocumentAfterUpdate)}`);
                           
                            
                            // Check if the trader uid has changed
                            // If trader uid has changed : close the trader's positions for each trader
                            if(configDocumentBeforeUpdate.trader_uid!==configDocumentAfterUpdate.trader_uid){
                                // NOTE: That the previousDocument b4 update might have empty trader details and weight.
                                if(configDocumentBeforeUpdate.trader_uid){
                                    await closePositionsForTraderWhenTraderIsRemovedFromSubAccountConfig({
                                        mongoDatabase,
                                        trader_uid:configDocumentBeforeUpdate.trader_uid,
                                        tg_user_id: userDocumentAfterUpdate.tg_user_id,
                                        config_type:"user_custom"
                                    });
            
                                }
                                 
                                
                            }
                            if(configDocumentBeforeUpdate.sub_link_name){ 
                                await updateSubAccountDocumentsToUpdatedSubAccountConfigData({
                                    mongoDatabase,
                                    sub_link_name: configDocumentBeforeUpdate.sub_link_name,
                                    updatedSubAccountConfigDocument:configDocumentAfterUpdate,
                                    user: userDocumentAfterUpdate
                                });
            
                            }

                        }
                    }

                }

            }catch(e){
                logger.error(`${FUNCTION_NAME} ${e.message}`);
            }
        });
        usersCollectionStateDetector.listenToUsersCollection();
        logger.info("Set usersCollectionStateDetector.listenToUsersCollection");
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



