/***
 * EXECUTOR STEPS
 * =================
 * GOAL: Place trades on user's account
 * CRITERIAS:
 * : Account balance is not less than minimum needed.
 * : 
 */





/**
 * Login to an exchange and place trades;
 */
const {Bybit} = require("../../Trader");
const { MongoDatabase , PositionsStateDetector} = require("../../MongoDatabase");
// const {Bybit} = require("../../Trader");

const {sleepAsync} = require("../../Utils/sleepAsync");
const { readAndConfigureDotEnv } = require("../../Utils/readAndConfigureDotEnv");
const {Logger} = require("../../Logger");
const {Telegram} = require("../../Telegram");

// local
const {newPositionHandler} = require("./newPositionHandler"); 
const {positionUpdateHandler} = require("./positionUpdateHandler"); 
const {positionResizeHandler} = require("./positionResizeHandler"); 
const {positionCloseHandler} = require("./positionCloseHandler"); 

 
const APP_NAME = "App:Executor";
const logger = new Logger({app_name:APP_NAME});
const {IS_LIVE} = {IS_LIVE:false};//require("../../appConfig");
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE);
process.env.TZ = dotEnvObj.TZ;


(async () => {
    /**
     * @type {MongoDatabase|null}
     */ 
    let mongoDatabase = null;
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
        logger.info("Create DB");
        await mongoDatabase.connect(dotEnvObj.DATABASE_NAME);
        logger.info("Connect DB");


        // Update position leverage
        const updateRes = await mongoDatabase.collection.openTradesCollection.updateDocument("6468f8c8e84ceb820aff6dac",{
            leverage: 24
            
        });
        console.log({updateRes});



        // const createtUserRes = await mongoDatabase.collection.usersCollection.createNewDocument({
        //     atomos: false,
        //     chatId:"101",
        //     copiedTraders:[],
        //     daysLeft:100,
        //     firstDate:new Date(),
        //     language:"english",
        //     privateKey:"",
        //     publicKey:"",
        //     status:true,
        //     testnet:true,
        //     tg_user_id:"101",
        //     totalMonths:12,
        //     totalPaid:100,
        //     totalPnl:100,
        //     totalRoi:10,
        //     updateDate:new Date(), 
        //     username:"Speet"
        // });
        // console.log({createtUserRes});
        // const speetUser = await mongoDatabase.collection.usersCollection.findOne({username:"Speet"});
        // console.log({speetUser});
        // if(speetUser){
        //     const updateRes = await mongoDatabase.collection.usersCollection.updateDocument(speetUser._id,{
        //         totalPnl:102,
        //         privateKey:"",
        //         publicKey:"",
        //     });
        //     console.log({updateRes});
        // }
        // const allSubbAccountConfigs = await(await mongoDatabase.collection.subAccountsConfigCollection.getAllDocuments()).toArray();
        // // delete emm all
        // const deleteRes = await mongoDatabase.collection.subAccountsConfigCollection.deleteManyDocumentsByIds(allSubbAccountConfigs.map((doc)=>doc._id));
        // console.log({
        //     deleteRes,
        //     total: allSubbAccountConfigs.length
        // });
        // const res = await mongoDatabase.collection.subAccountsConfigCollection.createNewDocument({
        //     trader_uid: "FB23E1A8B7E2944FAAEC6219BBDF8243",
        //     weight: 0.1,
        //     testnet: true,
        //     sub_link_name:"Sub_1"
        // });
        // console.log({res});

        ///////////////////////////////////////////////////////////////
        // Create sub accounts and make a tranfer from main account and get api key andd make a trade in sub account and transfer money back
        /**
                 * Connect to user Bybit Account
                 */
        // const bybit = new Bybit({
        //     millisecondsToDelayBetweenRequests: 5000,
        //     privateKey: dotEnvObj.BYBIT_PRIVATE_KEY,
        //     publicKey: dotEnvObj.BYBIT_PUBLIC_KEY,
        //     testnet: true
        // });

        // logger.info("Sending an order to update the position at bybit_RestClientV5");
        // const updatePositionRes = await bybit.clients.bybit_RestClientV5.updateAPosition({
        //     category: "linear",
        //     orderId: "f567ab7e-9a18-49c5-a515-4abebfbb2e0e",
        //     symbol: "RLCUSDT",
        //     qty: "0",
        // });
        // console.log({ updatePositionRes:updatePositionRes.result });

        // const getClosedPostionOrderHistory_Res = await bybit.clients.bybit_RestClientV5.getOrderHistory({
        //     category:"linear",
        //     symbol: "RLCUSDT",
        //     orderId: "07d2a19c-7148-453a-b4d9-fa0f17b5746c"
        // });
        // if(getClosedPostionOrderHistory_Res.retCode!==0)throw new Error(getClosedPostionOrderHistory_Res.retMsg);
        // console.log("getClosedPostionOrderHistory_Res");
        // console.log(getClosedPostionOrderHistory_Res.result);
        
        // const closedPartialPNL_res = await bybit.clients.bybit_RestClientV5.getClosedPositionPNL({
        //     category:"linear",
        //     symbol:"RLCUSDT",
        // });
        // console.log({
        //     closedPartialPNL_res:closedPartialPNL_res.result
        // });


        // const res = await bybit.clients.bybit_RestClientV5.getClosedPositionInfo({
        //     category:"linear",
        //     orderId:"07d2a19c-7148-453a-b4d9-fa0f17b5746c"
        
        // });
        // console.log({
        //     res: res.result
        // });
        // orderId: '07d2a19c-7148-453a-b4d9-fa0f17b5746c'
        // Get Existing Sub Accounts on Bybit 
        // const getSubUIDList_Res = await bybit.clients.bybit_RestClientV5.getSubUIDList();
        // if(getSubUIDList_Res.retCode!==0)throw new Error(getSubUIDList_Res.retMsg);
        // const subAccountsPresentInUserBybitAccount_Array = getSubUIDList_Res.result.subMembers;
        // console.log({subAccountsPresentInUserBybitAccount_Array});
        // // Get Account info
        // const getAccountInfo_Res = await bybit.clients.bybit_AccountAssetClientV3.getAPIKeyInformation();
        // console.log("getAccountInfo_Res");
        // console.log({getAccountInfo_Res});
        // console.log({
        //     permissions: getAccountInfo_Res.result.permissions
        // });
        // const MASTER_UID = getAccountInfo_Res.result.userID;

        // // // Get sub accounts
        // const getSubAccounts_Res = await bybit.clients.bybit_RestClientV5.getSubUIDList();
        // console.log("getSubAccounts_Res");
        // console.log({getSubAccounts_Res: getSubAccounts_Res.result.subMembers});

        // // console.log(getSubAccounts_Res.result.subMembers);
        // // return;
        // // Create a sub account
        // const createSubAccount2_Res = await bybit.clients.bybit_RestClientV5.createSubAccount({
        //     memberType:1,
        //     username:"SubAcc1",
        //     note:"Atomos Default Config",
        //     switch:1
        // });
        // console.log("createSubAccount2_Res");
        // console.log({createSubAccount2_Res});
        // // delete
        // // Get sub accounts
        // const getSubAccounts_Res2 = await bybit.clients.bybit_RestClientV5.getSubUIDList();
        // console.log("getSubAccounts_Res2");
        // console.log({getSubAccounts_Res2: getSubAccounts_Res2.result.subMembers});

        // const createSubAccount_Res = await bybit.clients.bybit_RestClientV5.createSubAccount({
        //     memberType:1,//Normal
        //     username:"APPTEST4",
        //     note:"Test Suubaccount creation",
        //     switch:1,//turn on quick login
        // });
        // console.log("createSubAccount_Res");
        // console.log({createSubAccount_Res});

        // // Get sub accounts
        // const getSubAccounts_Res1 = await bybit.clients.bybit_RestClientV5.getSubUIDList();
        // console.log("getSubAccounts_Res1");
        // console.log({getSubAccounts_Res1});
        // const subUid = getSubAccounts_Res1.result.subMembers[0].uid;
        // // CCreate API key
        // const getApiKey_Res = await bybit.clients.bybit_RestClientV5.createSubAccountUIDAPIKey({
        //     permissions:{
        //         ContractTrade:["Order","Position"],
        //         Derivatives:["DerivativesTrade"],
        //         Wallet:["AccountTransfer","SubMemberTransferList"],
        //         Exchange:["ExchangeHistory"]

        //     },
        //     readOnly: 0,//Read and Write
        //     subuid: subUid,
        //     note: "APPTEST4 Api Key"
        // });
        // console.log("getApiKey_Res");
        // console.log({getApiKey_Res});
        //     id: '478259',
        //   note: 'APPTEST4 Api Key',
        //   apiKey: 'msQ9PJI9XP6rJHaB3W',
        //   readOnly: 0,
        //   secret: 'p776s7CaFhDf4QvfzvUTZB3afUgqm9fnUVA8',
        //   permissions: [Object]
        //     uid: '1469946',
        //   username: 'APPTEST4',
        //   memberType: 1,
        //   status: 1,
        //   remark: 'Test Suubaccount creation'

        // Enale SubUID universal Transer
        // const enableUniversalTransfer_Res = await bybit.clients.bybit_RestClientV5.enableUniversalTransferForSubAccountsWithUIDs(["1469946",MASTER_UID.toString()]);
        // console.log("enableUniversalTransfer_Res");
        // console.log({enableUniversalTransfer_Res});
        // Transfer money from Main account
        // const createUniversalTransfer_Res = await bybit.clients.bybit_RestClientV5.createUniversalTransfer({
        //     amount: "1000",
        //     coin:"USDT",
        //     fromAccountType:"CONTRACT",
        //     toAccountType:"CONTRACT",
        //     toMemberId:1469946,
        //     fromMemberId: MASTER_UID,
        //     transferId: require("../../Utils/generateUID").generateUID()
        // });
        // console.log("createUniversalTransfer_Res");
        // console.log({createUniversalTransfer_Res});

        // login to sub accccount 
        // const bybitSub = new Bybit({
        //     millisecondsToDelayBetweenRequests: 5000,
        //     privateKey: "p776s7CaFhDf4QvfzvUTZB3afUgqm9fnUVA8",
        //     publicKey: "msQ9PJI9XP6rJHaB3W",
        //     testnet: true
        // }); 
        // // Get Account info
        // const getAccountInfo_Res2 = await bybit.clients.bybit_AccountAssetClientV3.getAPIKeyInformation();
        // console.log("getAccountInfo_Res2");
        // console.log({getAccountInfo_Res2});
        // console.log({
        //     permissions: getAccountInfo_Res2.result.permissions
        // });
        // const position = {
        //     pair:"BTCUSDT",
        //     size: 1
        // };
        // const standardized_qty = 0.001;
        // const newLeverage = 10;
        // // Switch position mode
        // const switchPositionMode_Res = await bybitSub.clients.bybit_LinearClient.switchPositionMode({
        //     mode:"BothSide",// 3:Both Sides
        //     symbol:position.pair,
        // });
        // if(switchPositionMode_Res.ext_code!==0){
        // // an error
        //     logger.error("switchPositionMode_Res: "+""+switchPositionMode_Res.ret_msg);
        // }

        // /**
        //      * Switch Margin
        //      */
        // const setPositionLeverage_Resp = await bybitSub.clients.bybit_LinearClient.switchMargin({
        //     is_isolated: true,
        //     buy_leverage:1,
        //     sell_leverage:1,
        //     symbol: position.pair,
        // });
        // if(setPositionLeverage_Resp.ret_code!==0){
        // // an error
        //     logger.error("setPositionLeverage_Resp: "+""+setPositionLeverage_Resp.ret_msg+"("+position.pair+")");
        // }
        // /**
        //      * Seet User Leverage
        //      */
        // const setUserLeverage_Res = await bybitSub.clients.bybit_LinearClient.setUserLeverage({
        //     buy_leverage: newLeverage,//position.leverage,
        //     sell_leverage: newLeverage,//position.leverage,
        //     symbol: position.pair
        // });
        // if(setUserLeverage_Res.ret_code!==0){
        // // an error
        //     logger.error("setUserLeverage_Res: "+""+setUserLeverage_Res.ret_msg+"("+position.pair+")");
        // }
        // logger.info("Sending openANewPosition Order to bybit_RestClientV5");
        // const openPositionRes = await bybitSub.clients.bybit_RestClientV5.openANewPosition({
        //     category:"linear",
        //     orderType:"Market",
        //     qty:String(standardized_qty),//String(symbolInfo.lot_size_filter.min_trading_qty),
        //     side: position.direction==="LONG"?"Buy":"Sell",
        //     symbol: position.pair,
        //     positionIdx:position.direction==="LONG"?1:2, //Used to identify positions in different position modes. Under hedge-mode, this param is required 0: one-way mode  1: hedge-mode Buy side 2: hedge-mode Sell side
        // });
        // if(!openPositionRes || !openPositionRes.result || Object.keys(openPositionRes.result).length==0){
        //     throw new Error(openPositionRes.retMsg);
        // }
        // console.log({openPositionRes});










        // const positionsStateDetector = new PositionsStateDetector({ mongoDatabase: mongoDatabase });
        // logger.info("Create PositionsStateDetector and set listeners");


        // await newPositionHandler({
        //     logger,
        //     mongoDatabase,
        //     positionsStateDetector
        // });
        // await positionUpdateHandler({
        //     logger,
        //     mongoDatabase,
        //     positionsStateDetector
        // });
        // await positionResizeHandler({
        //     logger,
        //     mongoDatabase,
        //     positionsStateDetector
        // });
        // await positionCloseHandler({
        //     logger,
        //     mongoDatabase,
        //     positionsStateDetector,
        // });

        

        

        

        // positionsStateDetector.listenToOpenTradesCollection();
        // logger.info("Set positionsStateDetector.listenToOpenTradesCollection");
        // positionsStateDetector.listenToOldTradesCollection();
        // logger.info("Set positionsStateDetector.listenToOldTradesCollection");
      
    }catch(error){
        if(mongoDatabase){
            await mongoDatabase.disconnect();
        }
        logger.error(JSON.stringify(error.message));
        await sleepAsync(5000);
        // throw error;
    }  
})();


// permissions: {
//     ContractTrade: [ 'Order', 'Position' ],
//     Spot: [ 'SpotTrade' ],
//     Wallet: [ 'AccountTransfer', 'SubMemberTransfer' ],
//     Options: [ 'OptionsTrade' ],
//     Derivatives: [ 'DerivativesTrade' ],
//     CopyTrading: [ 'CopyTrading' ],
//     BlockTrade: [],
//     Exchange: [ 'ExchangeHistory' ],
//     NFT: [ 'NFTQueryProductList' ]
//   }



//========================
