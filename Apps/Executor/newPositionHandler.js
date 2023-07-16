//@ts-check
const { DecimalMath } = require("../../DecimalMath");
const {Bybit} = require("../../Trader");

const {newPositionSizingAlgorithm} = require("./algos/qty");
const { setUpSubAccountsForUser } = require("./setUpSubAccountsForUser");

/**
 * 
 * @param {{
 *      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
 *      logger: import("../../Logger").Logger,
 *      positionsStateDetector: import("../../MongoDatabase").PositionsStateDetector,
 *      onErrorCb:(error:Error)=>any
 * }} param0 
 */
module.exports.newPositionHandler = async function newPositionHandler({
    logger,mongoDatabase,positionsStateDetector,onErrorCb
}){ 
    const FUNCTION_NAME = "fn:newPositionHandler";
    console.log(FUNCTION_NAME);
    positionsStateDetector.onNewPosition(async (position, trader) => {
        logger.info("New Position Added To DB");
        try{

            /****
             * Get all users cursor
             * 
             */
            const users_Cursor = await mongoDatabase.collection.usersCollection.getAllDocumentsBy({
                status: true
            });
            const users_array = await users_Cursor.toArray();
            const promises = [];
            for(const user of users_array){ 
                try {
                    
                    console.log("Pushing handler async functions");
                    promises.push(handler({
                        // bybit:bybitSubAccount,
                        logger,mongoDatabase,position,trader,user,
                        onErrorCb:(error)=>{
                            const newErrorMessage = `(fn:newPositionHandler)  trader :${trader.username}) and user :(${user.tg_user_id}) ${error.message}`;
                            error.message = newErrorMessage;
                            onErrorCb(error);
                        }
                    }));

                }catch(error){
                    // Error thrown only for user but loop not to be stopped
                    const newErrorMessage = `(fn:newPositionHandler) trader :${trader.username}) and user :(${user.tg_user_id}) ${error.message}`;
                    error.message = newErrorMessage;
                    onErrorCb(error);
                }
            }

            await Promise.allSettled(promises);

  
            
        }catch(error){
            console.log({error});
            let errorMsg = "(fn:newPositionHandler) "+ (error && error.message?error.message:"");
            errorMsg+=" ("+position.pair+")";
            logger.error(JSON.stringify(errorMsg));
        }
    });

};



/**
 * 
 * @param {{
*      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
*      logger: import("../../Logger").Logger,
*      position: import("../../MongoDatabase/collections/open_trades/types").OpenTrades_Collection_Document_Interface,
*      trader: import("../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface,
*      user: import("../../MongoDatabase/collections/users/types").Users_Collection_Document_Interface,
*      onErrorCb:(error:Error)=>any
*}} param0 

*/
async function handler({
    // bybit,
    logger,mongoDatabase,position,trader,user,onErrorCb
}){
    try{ 
        const compareArrays = function(array1, array2) {
            let allSynced = true;
            array1.forEach(obj1 => {
                // Find matching object in array2 based on 'sub_link_name'
                const obj2 = array2.find(obj => obj.sub_link_name === obj1.sub_link_name);
        
                if (obj2) {
                    // Check if 'trader_uid', 'trader_username' and 'weight' match
                    if (obj1.trader_uid === obj2.trader_uid &&
                        obj1.trader_username === obj2.trader_username &&
                        obj1.weight === obj2.weight) {
        
                        // If they match, add object to result array with subAccountIsSetAndReady = true
                    } else {
                        // If they don't match, add object to result array with subAccountIsSetAndReady = false
                        allSynced = false;
                    }
                }else {
                    allSynced = false;
                }
            });
        
            return allSynced;
        };
        //////////////////
        /**
         * Validate if user subaccounts are accurate
         */
        const userSubAccountConfigDocuments = user.atomos===true? await (await mongoDatabase.collection.subAccountsConfigCollection.getAllDocuments()).toArray() : user.custom_sub_account_configs;
        const userSubAccountDocuments = await (await mongoDatabase.collection.subAccountsCollection.getAllDocumentsBy({tg_user_id:user.tg_user_id, testnet:user.testnet}) ).toArray();
        console.log({userSubAccountConfigDocuments});
        console.log({userSubAccountDocuments});
        // let subAccountsAreSetAndReady = true;
        let subAccountsAreSetAndReady = compareArrays(userSubAccountConfigDocuments,userSubAccountDocuments);
        // for(const subAccountConfigDocument of userSubAccountConfigDocuments){
        //     let subAccountIsSetAndReady = false;
        //     userSubAccountDocuments.forEach((subAccount)=>{
        //         if(
        //             subAccount.sub_link_name === subAccountConfigDocument.sub_link_name &&
        //             subAccount.trader_uid === subAccountConfigDocument.trader_uid  &&
        //             subAccount.trader_username === subAccountConfigDocument.trader_username  &&
        //             subAccount.weight === subAccountConfigDocument.weight  
        //         ){
        //             subAccountIsSetAndReady = true;  
        //         }
        //     });
        //     if(subAccountIsSetAndReady===false){
        //         subAccountsAreSetAndReady = false;
        //     }
        // } 
        console.log({subAccountsAreSetAndReady});
        if(subAccountsAreSetAndReady===false){
            // set up sub accounts for user
            await setUpSubAccountsForUser({
                mongoDatabase,user
            });
        }  

        ////////////////////////////////////////////////
        /**
         * Connect to user subaccount Bybit Account
         */


        // Login to user's sub account of this trader
        const subAccountDocument = await mongoDatabase.collection.subAccountsCollection.findOne({
            tg_user_id: user.tg_user_id,
            trader_uid: trader.uid,
            testnet: user.testnet 
        });
        if(!subAccountDocument) throw new Error("No SubAccount found in subAccountDocument");
        if(!subAccountDocument.weight ||Number(subAccountDocument.weight)===0)throw new Error(`subAccountDocument.weight===${subAccountDocument.weight}`);
        const bybitSubAccount = new Bybit({
            millisecondsToDelayBetweenRequests: 5000,
            privateKey: subAccountDocument.private_api,
            publicKey: subAccountDocument.public_api,
            testnet: subAccountDocument.testnet===false?false:true
        });



        /////////////////////////////////////////
        const bybit = bybitSubAccount;


        logger.info("Calculate percentageBased_DynamicPositionSizingAlgo");
        const {sizesToExecute, symbolLotStepSize, symbolMaxLotSize} = await newPositionSizingAlgorithm({
            bybit,
            position,
            trader,
            mongoDatabase,
            action:"new_trade",
            user
        });
        const sizeToExecute = sizesToExecute[0];
        console.log({sizesToExecute,sizeToExecute});
        
        if(sizeToExecute===0||!sizeToExecute)throw new Error("sizeToExecute==="+sizeToExecute);
        const total_standardized_qty = sizesToExecute.reduce((a,b)=>a+b,0);
        console.log({total_standardized_qty});
        // Switch position mode
        const switchPositionMode_Res = await bybit.clients.bybit_LinearClient.switchPositionMode({
            mode:"BothSide",// 3:Both Sides
            symbol:position.pair,
        });
        if(String(switchPositionMode_Res.ext_code)!=="0"){
            // an error
            logger.error("switchPositionMode_Res: "+""+switchPositionMode_Res.ret_msg);
        }
    
        /**
                 * Switch Margin
                 */
        const setPositionLeverage_Resp = await bybit.clients.bybit_LinearClient.switchMargin({
            is_isolated: true,
            buy_leverage:1,
            sell_leverage:1,
            symbol: position.pair,
        });
        if(setPositionLeverage_Resp.ret_code!==0){
            // an error
            logger.error("setPositionLeverage_Resp: "+""+setPositionLeverage_Resp.ret_msg+"("+position.pair+")");
        }
        /**
                 * Seet User Leverage
                 */
        const setUserLeverage_Res = await bybit.clients.bybit_LinearClient.setUserLeverage({
            buy_leverage: position.leverage,
            sell_leverage: position.leverage,
            symbol: position.pair
        });
        if(setUserLeverage_Res.ret_code!==0){
            // an error
            logger.error("setUserLeverage_Res: "+""+setUserLeverage_Res.ret_msg+"("+position.pair+")");
        }
        logger.info("Sending openANewPosition Order to bybit_RestClientV5");
        const {openPositionsRes} = await bybit.clients.bybit_RestClientV5.openANewPosition({
            orderParams: {
                category:"linear",
                orderType:"Market",
                qty:String(total_standardized_qty),//String(symbolInfo.lot_size_filter.min_trading_qty),
                side: position.direction==="LONG"?"Buy":"Sell",
                symbol: position.pair,
                positionIdx:position.direction==="LONG"?1:2, //Used to identify positions in different position modes. Under hedge-mode, this param is required 0: one-way mode  1: hedge-mode Buy side 2: hedge-mode Sell side
            },
            symbolLotStepSize,
            symbolMaxLotSize
        });
        
        // const arrayWithQuantitiesLeftToExecute = sizesToExecute;
        // console.log({openPositionRes,arrayWithQuantitiesLeftToExecute});
        // if(!openPositionRes || !openPositionRes.result || Object.keys(openPositionRes.result).length==0){
        //     throw new Error(`${openPositionRes.retMsg} standardized_qty:${standardized_qty}`);
        // }
        // logger.info("Got response from openANewPosition Order from bybit_RestClientV5");
        // console.log({openPositionRes});
        // logger.info("The openANewPosition response has a orderId Meaning order was successfull");
        // logger.info("Getting a list of open active orders from bybit_RestClientV5");
        // const getActiveOrders_Res = await bybit.clients.bybit_RestClientV5.getActiveOrders({
        //     category:"linear",
        //     symbol: position.pair, 
        //     orderId: openPositionRes.result.orderId,
        // });
        // if(!getActiveOrders_Res ||!getActiveOrders_Res.result ||Object.keys(getActiveOrders_Res.result).length==0){
        //     throw new Error(getActiveOrders_Res.retMsg);
        // }
        // logger.info("Got a list of active orders from bybit_RestClientV5");
        // const orderInExchange = getActiveOrders_Res.result.list.find((accountOrderV5)=>accountOrderV5.orderId===openPositionRes.result.orderId);
        // console.log({orderInExchange});
        // if(!orderInExchange)throw new Error("Active order for opened order orderId: "+openPositionRes.result.orderId+" not found in active orders");
        // logger.info("Saving the position to DB");
        // // successfully placed a position


        let someCloseIsSucccessful = false;
        // const closedPositionAccumulatedDetails = {
        //     closedlPNL:0,
        //     avgExitPrice: 0,
        //     leverage: 0,
        //     qty: 0,
        //     close_datetime:new Date(),
        //     averageEntryPrice: 0,
        //     positionCurrentValue: 0
        // };
        // Loop through closePositionsRes 
        for (const openPositionResObj of openPositionsRes){
            const openPositionRes = openPositionResObj.response;
            if(openPositionRes.retCode!==0){
                // throw new Error(openPositionRes.retMsg);
                //instead send error message 
                logger.error("openPositionRes:"+openPositionRes.retMsg);
            }else {
                someCloseIsSucccessful = true;
                logger.info("Position closed on bybit_RestClientV5");
                logger.info("Get closed position info");
            }
        }

        if(someCloseIsSucccessful){
            const getOpenPosition_Result =  await bybit.clients.bybit_RestClientV5.getPositionInfo_Realtime({
                category:"linear",
                // settleCoin:"USDT"
                symbol: position.pair,
                
            });
    
            console.log({getOpenPosition_Result});
            if(getOpenPosition_Result.retCode!==0)throw new Error(`getOpenPosition_Result: ${getOpenPosition_Result.retMsg}`);
            const theTradeInBybit = getOpenPosition_Result.result.list.find((p)=>{
                console.log({
                    p
                });
                if(
                    p.side===(position.direction==="LONG"?"Buy":"Sell")
                    &&
                    p.symbol===position.pair
                ){
                    return p;
                }
            });
    
            if(!theTradeInBybit)throw new Error(`(getOpenPosition_Result) theTradeInBybit is ${theTradeInBybit}`);
            console.log({theTradeInBybit});
     
            const nowDate = new Date();
            await mongoDatabase.collection.tradedPositionsCollection.createNewDocument({
                entry_price: parseFloat(theTradeInBybit.avgPrice),
                testnet: user.testnet,
                leverage: position.leverage,
                pair: position.pair,
                position_id_in_openTradesCollection: position._id,
                size: parseFloat(theTradeInBybit.size),
                status: "OPEN",
                trader_uid: trader.uid,
                trader_username: trader.username?trader.username:"",
                entry_datetime: new Date(parseFloat(theTradeInBybit.createdTime)),
                direction: position.direction,
                traded_value: new DecimalMath(parseFloat(theTradeInBybit.positionValue)).divide(position.leverage).getResult(),
                tg_user_id: user.tg_user_id,
                actual_position_leverage: position.leverage,
                actual_position_original_size: position.size,
                actual_position_size: position.size,
                document_created_at_datetime: nowDate,
                document_last_edited_at_datetime: nowDate,
                //@ts-ignore
                position_id_in_oldTradesCollection: null,
                server_timezone: process.env.TZ?process.env.TZ:"",
                closed_roi_percentage: 0,
                close_price: 0,
                closed_pnl: 0, 
                
                
            });
            logger.info("Saved the position to DB");

        }

        


        

    }catch(error){
        const newErrorMessage = `(fn:handler) trader:${trader.username} user:${user.username} user_tg_id:${user.tg_user_id} ${error.message}`;
        error.message = newErrorMessage;
        onErrorCb(error);
        // throw error;
    }

}