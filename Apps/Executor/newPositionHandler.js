//@ts-check
const {Bybit} = require("../../Trader");

const {newPositionSizingAlgorithm} = require("./algos/qty");

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
    console.log("fn:newPositionHandler");
    positionsStateDetector.onNewPosition(async (position, trader) => {
        logger.info("New Position Added To DB");
        try{

            /****
             * Get all users cursor
             * 
             */
            const users_Cursor = await mongoDatabase.collection.usersCollection.getAllDocuments();
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
        const bybitSubAccount = new Bybit({
            millisecondsToDelayBetweenRequests: 5000,
            privateKey: subAccountDocument.private_api,
            publicKey: subAccountDocument.public_api,
            testnet: subAccountDocument.testnet===false?false:true
        });



        /////////////////////////////////////////
        const bybit = bybitSubAccount;


        logger.info("Calculate percentageBased_DynamicPositionSizingAlgo");
        const {sizeToExecute} = await newPositionSizingAlgorithm({
            bybit,
            position,
            trader,
            mongoDatabase,
            action:"new_trade",
            user
        });
        const standardized_qty = sizeToExecute;
                
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
        const openPositionRes = await bybit.clients.bybit_RestClientV5.openANewPosition({
            category:"linear",
            orderType:"Market",
            qty:String(standardized_qty),//String(symbolInfo.lot_size_filter.min_trading_qty),
            side: position.direction==="LONG"?"Buy":"Sell",
            symbol: position.pair,
            positionIdx:position.direction==="LONG"?1:2, //Used to identify positions in different position modes. Under hedge-mode, this param is required 0: one-way mode  1: hedge-mode Buy side 2: hedge-mode Sell side
        });
        if(!openPositionRes || !openPositionRes.result || Object.keys(openPositionRes.result).length==0){
            throw new Error(`${openPositionRes.retMsg} standardized_qty:${standardized_qty}`);
        }
        logger.info("Got response from openANewPosition Order from bybit_RestClientV5");
        console.log({openPositionRes});
        logger.info("The openANewPosition response has a orderId Meaning order was successfull");
        logger.info("Getting a list of open active orders from bybit_RestClientV5");
        const getActiveOrders_Res = await bybit.clients.bybit_RestClientV5.getActiveOrders({
            category:"linear",
            symbol: position.pair,
            orderId: openPositionRes.result.orderId,
        });
        if(!getActiveOrders_Res ||!getActiveOrders_Res.result ||Object.keys(getActiveOrders_Res.result).length==0){
            throw new Error(getActiveOrders_Res.retMsg);
        }
        logger.info("Got a list of active orders from bybit_RestClientV5");
        const orderInExchange = getActiveOrders_Res.result.list.find((accountOrderV5)=>accountOrderV5.orderId===openPositionRes.result.orderId);
        console.log({orderInExchange});
        if(!orderInExchange)throw new Error("Active order for opened order orderId: "+openPositionRes.result.orderId+" not found in active orders");
        logger.info("Saving the position to DB");
        // successfully placed a position
    

        const nowDate = new Date();
        await mongoDatabase.collection.tradedPositionsCollection.createNewDocument({
            entry_price: parseFloat(orderInExchange.avgPrice),
            testnet: user.testnet,
            leverage: position.leverage,
            pair: position.pair,
            position_id_in_openTradesCollection: position._id,
            size: parseFloat(orderInExchange.qty),
            status: "OPEN",
            trader_uid: trader.uid,
            trader_username: trader.username?trader.username:"",
            entry_datetime: new Date(parseFloat(orderInExchange.createdTime)),
            direction: position.direction,
            traded_value: (parseFloat(orderInExchange.cumExecValue) / position.leverage),
            order_id: openPositionRes.result.orderId,
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
            close_datetime: nowDate,
            close_price: 0,
            closed_pnl: 0, 
            
            
        });
        logger.info("Saved the position to DB");

    }catch(error){
        const newErrorMessage = `(fn:handler) ${error.message}`;
        error.message = newErrorMessage;
        onErrorCb(error);
        // throw error;
    }

}