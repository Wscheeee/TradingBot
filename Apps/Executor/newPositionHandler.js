const {Bybit} = require("../../Trader");

const {newPositionSizingAlgorithm} = require("./algos/qty");
const {createSubAccountsForUserIfNotCreated} = require("./createSubAccountsForUserIfNotCreated");
const {allocateCapitalToSubAccounts} = require("./allocateCapitalToSubAccounts");

/**
 * 
 * @param {{
 *      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
 *      logger: import("../../Logger").Logger,
 *      positionsStateDetector: import("../../MongoDatabase").PositionsStateDetector
 * }} param0 
 */
module.exports.newPositionHandler = async function newPositionHandler({
    logger,mongoDatabase,positionsStateDetector
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
                /**
                 * Connect to user Bybit Account
                 */
                const bybit = new Bybit({
                    millisecondsToDelayBetweenRequests: 5000,
                    privateKey: user.privateKey,
                    publicKey: user.publicKey,
                    testnet: user.testnet===false?false:true
                });

                // 
                await createSubAccountsForUserIfNotCreated({
                    bybit,mongoDatabase,trader,user
                });
                console.log("fin:createSubAccountsForUserIfNotCreated");
                await allocateCapitalToSubAccounts({
                    bybit,mongoDatabase,user
                });
                console.log("fin:allocateCapitalToSubAccounts");

                // Login to user's sub account of this trader
                const subAccountDocument = await mongoDatabase.collection.subAccountsCollection.findOne({
                    tg_user_id: user.tg_user_id,
                    trader_uid: trader.uid,
                });
                if(!subAccountDocument) throw new Error(`No SubAccount found in subAccountDocument for trader :${trader.username}) and user :(${user.usernames}) `);
                const bybitSubAccount = new Bybit({
                    millisecondsToDelayBetweenRequests: 5000,
                    privateKey: subAccountDocument.private_api,
                    publicKey: subAccountDocument.puplic_api,
                    testnet: subAccountDocument.testnet===false?false:true
                });
                console.log("Pushing handler asyncc functions");
                promises.push(handler({
                    bybit:bybitSubAccount,
                    logger,mongoDatabase,position,trader,user
                }));
            }
            await Promise.all(promises);


            
            
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
*      bybit: import("../../Trader").Bybit,
*      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
*      logger: import("../../Logger").Logger,
*      position: import("../../MongoDatabase/collections/open_trades/types").OpenTrades_Collection_Document_Interface,
*      trader: import("../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface,
*      user: import("../../MongoDatabase/collections/users/types").Users_Collection_Document_Interface,
*
* }} param0 
*/
async function handler({
    bybit,logger,mongoDatabase,position,trader,user
}){
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
    if(switchPositionMode_Res.ext_code!==0){
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
        throw new Error(openPositionRes.retMsg);
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

    // Find the trade related to the user
    const userTradeDoc = await mongoDatabase.collection["tradedPositionsCollection"].findOne({
        status: "OPEN",
        pair: position.pair,
        direction: position.direction,
        trader_uid: position.trader_uid,
        tg_user_id: user.tg_user_id
    });
    if(!userTradeDoc) throw new Error("userTradeDoc not found");
            
    await mongoDatabase.collection.tradedPositionsCollection.updateDocument(userTradeDoc._id,{
        entry_price: bybit.getPositionEntryPrice(orderInExchange),
        leverage: position.leverage,
        pair: position.pair,
        position_id_in_openTradesCollection: position._id,
        size: parseFloat(orderInExchange.qty),
        status: "OPEN",
        trader_uid: trader.uid,
        trader_username: trader.username,
        entry_datetime: new Date(parseFloat(orderInExchange.createdTime)),
        direction: position.direction,
        traded_value: (orderInExchange.cumExecValue / position.leverage),
        order_id: openPositionRes.result.orderId,
    });
    logger.info("Saved the position to DB");

}