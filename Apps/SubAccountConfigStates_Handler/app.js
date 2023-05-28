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

const APP_NAME = "App:SubAccountConfigStates_Handler";
const logger = new Logger({app_name:APP_NAME});
const {IS_LIVE} = require("../../appConfig");
const { DateTime } = require("../../DateTime");
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
                if(configDocumentBeforeUpdate.trader_uid!==configDocumentAfterUpdate.trader_uid){
                    //trader uid changed
                    // loop through all users
                    const users_Cursor = await mongoDatabase.collection.usersCollection.getAllDocuments();
                    while(await users_Cursor.hasNext()){
                        const userDocument = await users_Cursor.next();
                        if(!userDocument)return;
                        // Get the sub acccount
                        const subAccountDocument = await mongoDatabase.collection.subAccountsCollection.findOne({
                            sub_link_name:configDocumentBeforeUpdate.sub_link_name,
                            tg_user_id: userDocument.tg_user_id,
                            testnet: userDocument.testnet,
                            trader_uid: configDocumentBeforeUpdate.trader_uid
                        });
                        if(!subAccountDocument){
                            logger.info(`subAccount not found for configDocumentBeforeUpdate:${JSON.stringify(configDocumentBeforeUpdate)} `);
                            return;
                        }

                        // Get all the open positions of the trader uid
                        const openPositions_ofTheTrader_Cursor = await mongoDatabase.collection.openTradesCollection.getAllDocumentsBy({
                            status:"OPEN",
                            trader_uid: configDocumentBeforeUpdate.trader_uid,
                        });

                        while(await openPositions_ofTheTrader_Cursor.hasNext()){
                            const positionToClose_ = await openPositions_ofTheTrader_Cursor.next();
                            if(!positionToClose_)return;
                            /**
                             * Close a position By sendiing an event to executor
                             */
                        
                            const datetimeNow = new Date();
                            await mongoDatabase.collection.oldTradesCollection.createNewDocument({
                                original_position_id: positionToClose_._id,
                                close_datetime: new Date(),
                                direction:positionToClose_.direction,
                                entry_price: positionToClose_.entry_price,
                                close_price: positionToClose_.mark_price,
                                followed: positionToClose_.followed,
                                copied: positionToClose_.copied,
                                leverage: positionToClose_.leverage,
                                mark_price: positionToClose_.mark_price,
                                open_datetime: positionToClose_.open_datetime,
                                original_size: positionToClose_.original_size,
                                pair:positionToClose_.pair,
                                part: positionToClose_.part,
                                pnl: positionToClose_.pnl,
                                roi: positionToClose_.roi,
                                roi_percentage: positionToClose_.roi_percentage,
                                size: positionToClose_.size,
                                previous_size_before_partial_close: positionToClose_.previous_size_before_partial_close,
                                status: "CLOSED",
                                total_parts: positionToClose_.total_parts,
                                trader_id: positionToClose_.trader_id,
                                trader_uid: positionToClose_.trader_uid ,
                                document_created_at_datetime: datetimeNow,
                                document_last_edited_at_datetime: datetimeNow,
                                server_timezone: process.env.TZ||"",
                                
                            });
                            // delete from openPositions collections
                            await mongoDatabase.collection.openTradesCollection.deleteManyDocumentsByIds([positionToClose_._id]);

                            /***
                             * ===================
                             */
                        }

                        
                    }
                    
                }
            }catch(e){
                logger.error(`subAcccountConfig.onCreateDocument ${e.message}`);
            }
        });
        subAccountsConfigCollectionStateDetector.onDeleteDocumentCallbacks(async (deletedConfigDocument)=>{
            try{
                logger.info(`subAcccountConfig.onDeleteDocumentCallbacks deletedConfigDocument:${JSON.stringify(deletedConfigDocument)}`);
                if(!mongoDatabase)return;
                
                // loop through all users
                const users_Cursor = await mongoDatabase.collection.usersCollection.getAllDocuments();
                while(await users_Cursor.hasNext()){
                    const userDocument = await users_Cursor.next();
                    if(!userDocument)return;
                    // Get the sub acccount
                    const subAccountDocument = await mongoDatabase.collection.subAccountsCollection.findOne({
                        sub_link_name:deletedConfigDocument.sub_link_name,
                        tg_user_id: userDocument.tg_user_id,
                        testnet: userDocument.testnet,
                        trader_uid: deletedConfigDocument.trader_uid
                    });
                    if(!subAccountDocument){
                        logger.info(`subAccount not found for deletedConfigDocument:${JSON.stringify(deletedConfigDocument)} `);
                        return;
                    }

                    // Get all the open positions of the trader uid
                    const openPositions_ofTheTrader_Cursor = await mongoDatabase.collection.openTradesCollection.getAllDocumentsBy({
                        status:"OPEN",
                        trader_uid: deletedConfigDocument.trader_uid,
                    });

                    while(await openPositions_ofTheTrader_Cursor.hasNext()){
                        const positionToClose_ = await openPositions_ofTheTrader_Cursor.next();
                        if(!positionToClose_)return;
                        /**
                         * Close a position By sendiing an event to executor
                         */
                    
                        const datetimeNow = new Date();
                        await mongoDatabase.collection.oldTradesCollection.createNewDocument({
                            original_position_id: positionToClose_._id,
                            close_datetime: new Date(),
                            direction:positionToClose_.direction,
                            entry_price: positionToClose_.entry_price,
                            close_price: positionToClose_.mark_price,
                            followed: positionToClose_.followed,
                            copied: positionToClose_.copied,
                            leverage: positionToClose_.leverage,
                            mark_price: positionToClose_.mark_price,
                            open_datetime: positionToClose_.open_datetime,
                            original_size: positionToClose_.original_size,
                            pair:positionToClose_.pair,
                            part: positionToClose_.part,
                            pnl: positionToClose_.pnl,
                            roi: positionToClose_.roi,
                            roi_percentage: positionToClose_.roi_percentage,
                            size: positionToClose_.size,
                            previous_size_before_partial_close: positionToClose_.previous_size_before_partial_close,
                            status: "CLOSED",
                            total_parts: positionToClose_.total_parts,
                            trader_id: positionToClose_.trader_id,
                            trader_uid: positionToClose_.trader_uid ,
                            document_created_at_datetime: datetimeNow,
                            document_last_edited_at_datetime: datetimeNow,
                            server_timezone: process.env.TZ||"",
                            
                        });
                        // delete from openPositions collections
                        await mongoDatabase.collection.openTradesCollection.deleteManyDocumentsByIds([positionToClose_._id]);

                        /***
                         * ===================
                         */
                    }

                    
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
