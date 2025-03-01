//@ts-check
/***
 * APP :
 * -------
 * Runs 
 * :-when configs change
 * :-When new user is created
 * :- At a certain time
 * : 
 */



const { MongoDatabase , SubAccountsConfigCollectionStateDetector,UsersCollectionStateDetector} = require("../../MongoDatabase");

const {sleepAsync} = require("../../Utils/sleepAsync");
const { readAndConfigureDotEnv } = require("../../Utils/readAndConfigureDotEnv");
const {generateUID} = require("../../Utils/generateUID");
const {Logger} = require("../../Logger");
const {Telegram} = require("../../Telegram");
const {IntervalLastInStackTaskRunner} = require("../../TaskRunner");
const intervalLastInStackTaskRunner = new IntervalLastInStackTaskRunner({intervalMs:100,uid:generateUID()}); 

// local
const {createSubAccountsAndAllocateCapital_forAllUsers_InParalell} = require("./createSubAccountsAndAllocateCapital_forAllUsers_InParalell");

const APP_NAME = "App:CreateSubAccountsAndAllocateCapital";
const logger = new Logger({app_name:APP_NAME});
const {IS_LIVE} = require("../../appConfig");
const { createSubAccountsAndAllocateCapital_forAllUsersWhoseLastAlloationIsMoreThan0neHourAgo_InParalell } = require("./createSubAccountsAndAllocateCapital_forAllUsersWhoseLastAlloationIsMoreThan0neHourAgo_InParalell");
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE);
process.env.TZ = dotEnvObj.TZ;


// let lastAllocationRunTimeInMs = 0;

// function update_lastAllocationRunTimeInMs(){
//     console.log("(fn:update_lastAllocationRunTimeInMs)");
//     lastAllocationRunTimeInMs = new DateTime().now().milliseconds;
// }

// /**
//  * @param {number} numberOfSeconds
//  */
// function isMsOfLasAllocationMoreThanSeconds(numberOfSeconds){
//     console.log("(fn:isMsOfLasAllocationMoreThanSeconds)");
//     const sms = (numberOfSeconds*1000);
//     const deltaMs =  new DateTime().now().milliseconds - lastAllocationRunTimeInMs;
//     if(deltaMs>=sms) {
//         console.log("(fn:isMsOfLasAllocationMoreThanSeconds): true");
//         return true;
//     }
//     console.log("(fn:isMsOfLasAllocationMoreThanSeconds): false");
//     return false;
// }



(async () => {
    /**
     * @type {MongoDatabase}
     */ 
    let mongoDatabase = new MongoDatabase(dotEnvObj.DATABASE_URI);
    let interval = null;
    try {
        
        logger.info("Start App");
        /***
		 * Error Telegram bot for sendding error messages to Telegram error channel.
		 */
        const errorbot = new Telegram({telegram_bot_token:dotEnvObj.TELEGRAM_BOT_TOKEN});
        logger.info("Create Telegrambot");
        logger.addLogCallback("error",async (cbIndex,message)=>{
            const blackListMessages = [];
            let messageIsNotInBlist = true; 
            for(const bMessage of blackListMessages){
                if(message.includes(bMessage)===true){
                    messageIsNotInBlist = false;
                }
                
            }
            if(messageIsNotInBlist){
                await errorbot.sendMessage(dotEnvObj.TELEGRAM_ERROR_CHHANNEL_ID,message);
                logger.info("Send error message to telegram error channel");
            }
        });

        const tg_user_bot = errorbot;


        logger.info("Create Bybit Client");
      
        console.log(dotEnvObj);
        // mongoDatabase = new MongoDatabase(dotEnvObj.DATABASE_URI);
        if(!mongoDatabase)throw new Error("Error creating mongoDatabase");
        logger.info("Create DB");
        await mongoDatabase.connect(dotEnvObj.DATABASE_NAME);
        logger.info("Connect DB");

        //////////////////////////////////
        // SUB ACCOUNTS CONFIG COLLECTION
        const subAccountsConfigCollectionStateDetector = new SubAccountsConfigCollectionStateDetector({ mongoDatabase: mongoDatabase });
        logger.info("Create SubAccountsConfigCollectionStateDetector and set listeners");
        subAccountsConfigCollectionStateDetector.onCreateDocument(async (configDocument)=>{
            try{
                logger.info(`subAcccountConfig.onCreateDocument ${configDocument.sub_link_name}`);
                if(!mongoDatabase)return;
                // Run allocations in TaskRunner
                intervalLastInStackTaskRunner.addJob(
                    async function (){
                        await createSubAccountsAndAllocateCapital_forAllUsers_InParalell({
                            mongoDatabase,
                            tg_user_bot,
                            onError: (error)=>{
                                logger.error(error.message);
                            }
                        });

                    }
                );
           
            }catch(e){
                logger.error(`subAcccountConfig.onCreateDocument ${e.message}`);
            }
        });
        subAccountsConfigCollectionStateDetector.onUpdateDocument(async (configDocumentBeforeUpdate, configDocumentAfterUpdate)=>{
            try{
                logger.info(`subAcccountConfig.onUpdateDocument ${configDocumentAfterUpdate.sub_link_name}`);
                if(!mongoDatabase)return;
                /**
                 * If weight updated update the weights in all associated sub accouunts documents
                 */
                if(configDocumentBeforeUpdate && configDocumentBeforeUpdate.sub_link_name){

                    const subAccountsDocuments_Cursor = await mongoDatabase.collection.subAccountsCollection.getAllDocumentsBy({
                        sub_link_name: configDocumentBeforeUpdate.sub_link_name
                    });
                    while(await subAccountsDocuments_Cursor.hasNext()){
                        const subAccountDocument = await subAccountsDocuments_Cursor.next();
                        if(!subAccountDocument)break;

                        //update sub account
                        await mongoDatabase.collection.subAccountsCollection.updateDocument(subAccountDocument._id,{
                            weight: configDocumentAfterUpdate.weight
                        });
                    }
                }
             
                // Run allocations in TaskRunner
                intervalLastInStackTaskRunner.addJob(
                    async function (){
                        await createSubAccountsAndAllocateCapital_forAllUsers_InParalell({
                            mongoDatabase,
                            tg_user_bot,
                            onError: (error)=>{
                                logger.error(error.message);
                            }
                        });

                    }
                );

            }catch(e){
                logger.error(`subAcccountConfig.onUpdateDocument ${e.message}`);
            }
        });

        
        subAccountsConfigCollectionStateDetector.listenToSubAccountsConfigCollection();
        logger.info("Set subAccountsConfigCollectionStateDetector.listenToSubAccountsConfigCollection");
        //////////////////////////////////


        //////////////////////////////////
        // USERS COLLECTION
        const usersCollectionStateDetector = new UsersCollectionStateDetector({ mongoDatabase: mongoDatabase });
        logger.info("Create UsersCollectionStateDetector and set listeners");
        usersCollectionStateDetector.onCreateDocument(async (user)=>{
            try{
                logger.info(`user.onCreateDocument ${user.tg_user_id}`);
                if(!mongoDatabase)return;
                // Run allocations in TaskRunner
                intervalLastInStackTaskRunner.addJob(
                    async function (){
                        await createSubAccountsAndAllocateCapital_forAllUsers_InParalell({
                            mongoDatabase, 
                            user,
                            tg_user_bot,
                            onError: (error)=>{
                                logger.error(error.message);
                            }
                        });

                    }
                ); 

            }catch(e){
                logger.error(`user.onCreateDocument ${e.message}`);
            }
        });

        usersCollectionStateDetector.onUpdateDocument(async (userDocumentBeforeUpdate, userDocumentAfterUpdate)=>{
            try{
                logger.info(`user.onUpdateDocument ${userDocumentAfterUpdate.tg_user_id}`);
                if(!mongoDatabase)return;
                if(userDocumentBeforeUpdate){
                    if(
                        userDocumentBeforeUpdate.atomos!==userDocumentAfterUpdate.atomos ||
                        userDocumentBeforeUpdate.status!==userDocumentAfterUpdate.status ||
                        userDocumentBeforeUpdate.privateKey!==userDocumentAfterUpdate.privateKey ||
                        userDocumentBeforeUpdate.publicKey!==userDocumentAfterUpdate.publicKey
                    ){
                        // Run allocations in TaskRunner
                        intervalLastInStackTaskRunner.addJob(
                            async function (){ 
                                await createSubAccountsAndAllocateCapital_forAllUsers_InParalell({
                                    mongoDatabase,
                                    user:userDocumentAfterUpdate,
                                    tg_user_bot,
                                    onError: (error)=>{
                                        logger.error(error.message);
                                    }
                                });
            
                            }
                        );
                            
                    }

                }

            }catch(e){
                logger.error(`user.onUpdateDocument ${e.message}`);
            }
        });

        usersCollectionStateDetector.onUserCustomConfigListUpdate(async (userDocumentBeforeUpdate,userDocumentAfterUpdate)=>{
            try{
                logger.info(`user.onUserCustomConfigListUpdate ${userDocumentAfterUpdate.tg_user_id}`);
                if(!mongoDatabase)return;
                // Loop throught the user's custom configs 
                // Run allocations in TaskRunner
                intervalLastInStackTaskRunner.addJob(
                    async function (){
                        await createSubAccountsAndAllocateCapital_forAllUsers_InParalell({
                            mongoDatabase,
                            user:userDocumentAfterUpdate,
                            tg_user_bot,
                            onError: (error)=>{
                                logger.error(error.message);
                            }
                        });

                    }
                );
            }catch(error){
                logger.error(`user.onCreateDocument ${error.message}`);
            }
        });

        

        
        usersCollectionStateDetector.listenToUsersCollection();
        logger.info("usersCollectionStateDetector.listenToUsersCollection");
        //////////////////////////////////


        //////////////////////////////////
        // RUN EVERY HOUR BU ONLY RUN FOR USERS WHOSE LAST ALLOCATION WAS NOT WITHIN THE HOUR.
        interval = setInterval(async()=>{
            logger.info("Running Allocation for oncce per hour.");
            // Run allocations in TaskRunner
            intervalLastInStackTaskRunner.addJob(
                async function (){
                    await createSubAccountsAndAllocateCapital_forAllUsersWhoseLastAlloationIsMoreThan0neHourAgo_InParalell({
                        mongoDatabase,
                        tg_user_bot, 
                        onError: (error)=>{
                            logger.error(error.message);
                        }
                    });

                } 
            );
        },(1000*60)*60);//1 hr
        
        // await createSubAccountsAndAllocateCapital_forAllUsersWhoseLastAlloationIsMoreThan0neHourAgo_InParalell({
        //     mongoDatabase,
        //     tg_user_bot,
        //     onError: (error)=>{
        //         logger.error(error.message);
        //     }
        // });

        await createSubAccountsAndAllocateCapital_forAllUsers_InParalell({
            mongoDatabase,
            // user:userDocumentAfterUpdate,
            tg_user_bot,
            onError: (error)=>{
                logger.error(error.message);
            }
        });
        
        
      
    }catch(error){
        console.log(error);
        intervalLastInStackTaskRunner.stop();
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
