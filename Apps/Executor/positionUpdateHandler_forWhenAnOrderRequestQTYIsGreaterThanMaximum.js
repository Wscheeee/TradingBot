//@ts-check
const {Bybit} = require("../../Trader");




// *      positionsStateDetector: import("../../MongoDatabase").PositionsStateDetector,
/**
 * 
 * @param {{
*      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
*      logger: import("../../Logger").Logger,
*      trader: import("../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface,
*      position: import("../../MongoDatabase/collections/open_trades/types").OpenTrades_Collection_Document_Interface,
*      user: import("../../MongoDatabase/collections/users/types").Users_Collection_Document_Interface,
*      sizeToExecute: number,
*      originalTradedPositionDocumentId: any
*      onErrorCb:(error:Error)=>any
* }} param0 
*/
module.exports.positionUpdateHandler_forWhenAnOrderRequestQTYIsGreaterThanMaximum = async function positionUpdateHandler_forWhenAnOrderRequestQTYIsGreaterThanMaximum({
    logger, mongoDatabase, position,user,trader,sizeToExecute, originalTradedPositionDocumentId,onErrorCb
}) {
    const FUNCTON_NAME = "(fn:positionUpdateHandler_forWhenAnOrderRequestQTYIsGreaterThanMaximum)";
    console.log(FUNCTON_NAME);
    try {
       
        const users_array = [user];//await users_Cursor.toArray();
        const promises = [];
        for(const user of users_array){
            try{
                
                promises.push(handler({
                    logger,
                    mongoDatabase,
                    position,
                    trader,
                    user,
                    sizeToExecute,
                    originalTradedPositionDocumentId,
                    onErrorCb:(error)=>{
                        const newErrorMessage = `${FUNCTON_NAME}  trader :${trader.username}) and user :(${user.tg_user_id}) ${error.message}`;
                        error.message = newErrorMessage;
                        onErrorCb(error);
                    }
                }));

            }catch(error){
                // Error thrown only for user but loop not to be stopped
                const newErrorMessage = `${FUNCTON_NAME} trader :${trader.username}) and user :(${user.tg_user_id}) ${error.message}`;
                error.message = newErrorMessage;
                onErrorCb(error);
            }

        }
        await Promise.allSettled(promises);



    } catch (error) {
        console.log({ error });
        let errorMsg = "${FUNCTON_NAME} " + (error && error.message ? error.message : "");
        errorMsg += " (" + position.pair + ")";
        logger.error(JSON.stringify(errorMsg));
    }


};


/**
 * 
 * @param {{
*      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
*      logger: import("../../Logger").Logger,
*      position: import("../../MongoDatabase/collections/open_trades/types").OpenTrades_Collection_Document_Interface,
*      trader: import("../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface,
*      user: import("../../MongoDatabase/collections/users/types").Users_Collection_Document_Interface,
*      sizeToExecute: number,
*      originalTradedPositionDocumentId: any,
*      onErrorCb:(error:Error)=>any
* }} param0 
*/
async function handler({ 
    logger,mongoDatabase,position,trader,user,sizeToExecute,originalTradedPositionDocumentId,onErrorCb
}){
    try {
        /////////////////////////////////////////////
        /**
         * Connect to user Bybit SubAccount Account
         */
        const subAccountDocument = await mongoDatabase.collection.subAccountsCollection.findOne({
            // tg_user_id: user.tg_user_id, 
            // trader_uid: trader.uid,
            // testnet: user.testnet 
            _id: originalTradedPositionDocumentId
        });
        console.log({trader});
        console.log({subAccountDocument});
        if(!subAccountDocument) throw new Error(`No SubAccount found in subAccountDocument for trader :${trader.username}) and user :(${user.tg_user_id}) `);
        console.log({subAccountDocument});
        const bybitSubAccount = new Bybit({
            millisecondsToDelayBetweenRequests: 5000,
            privateKey: subAccountDocument.private_api,
            publicKey: subAccountDocument.public_api,
            testnet: subAccountDocument.testnet===false?false:true
        });


        /////////////////////////////////////////////
        const bybit = bybitSubAccount;

        /**
         * Check that the position is in db
         * */
        const tradedPositionObj = await mongoDatabase.
            collection.
            tradedPositionsCollection.
            findOne({
                direction: position.direction,
                pair: position.pair,
                trader_uid: trader.uid,
                testnet: user.testnet
            });
        logger.info("Return from mongoDatabase.collection.tradedPositionsCollection.getOneOpenPositionBy");
    
        if (!tradedPositionObj) throw new Error("Position to update not in DB meaning itt was not traded");
        logger.info("Position found in db: Working on it");
    
        // /**
        //  * Get the order
        //  */
        // const getOrderHistory_Res = await bybit.clients.bybit_RestClientV5.getOrderHistory({
        //     category: "linear",
        //     orderId: tradedPositionObj.order_id
        // });
        // if (Object.keys(getOrderHistory_Res.result).length === 0) throw new Error(getOrderHistory_Res.retMsg);
        // const orderObject = getOrderHistory_Res.result.list.find((accountOrderV5_) => accountOrderV5_.orderId === tradedPositionObj.order_id);
        // if (!orderObject) throw new Error("orderObject not found in order history");
        // console.log({ orderObject });
    
    
        /**
         * Calculate the updated qty
         */
        logger.info("Calculate percentageBased_DynamicPositionSizingAlgo");
        // const { sizeToExecute } = await newPositionSizingAlgorithm({
        //     bybit,
        //     position,
        //     trader,
        //     mongoDatabase,
        //     action: "update",
        //     user
        // });
        // if(sizeToExecute===0)throw new Error("sizeToExecute==="+sizeToExecute);
        const standardized_qty = sizeToExecute;
    
        if (standardized_qty == parseFloat(String(tradedPositionObj.size))) throw new Error("Not updating the position as qty not changed");
        logger.info("qy changed so updating the order");
        /**
         * Switch position mode
         * */
        const switchPositionMode_Res = await bybit.clients.bybit_LinearClient.switchPositionMode({
            mode: "BothSide",// 3:Both Sides
            symbol: position.pair,
        });
        if (String(switchPositionMode_Res.ext_code) !== "0") {
        // an error
            logger.error("switchPositionMode_Res: " + "" + switchPositionMode_Res.ret_msg);
        }
        /**
         * Switch margin
         * */
        const setPositionLeverage_Resp = await bybit.clients.bybit_LinearClient.switchMargin({
            is_isolated: true,
            buy_leverage: 1,
            sell_leverage: 1,
            symbol: position.pair
        });
        if (setPositionLeverage_Resp.ret_code !== 0) {
        // an error
            logger.error("setPositionLeverage_Resp: " + setPositionLeverage_Resp.ret_msg + "(" + position.pair + ")");
        }
    
        /**
         * Set position leverage
         * */
        const setUserLeverage_Res = await bybit.clients.bybit_LinearClient.setUserLeverage({
            buy_leverage: position.leverage,
            sell_leverage: position.leverage,
            symbol: position.pair
        });
        if (setUserLeverage_Res.ret_code !== 0) {
        // an error
            logger.error("setUserLeverage_Res: " + setUserLeverage_Res.ret_msg + "(" + position.pair + ")");
        }
    
        logger.info("Sending an order to update the position at bybit_RestClientV5");
        logger.info("Sending openANewPosition Order to bybit_RestClientV5");
        const {openPositionRes} = await bybit.clients.bybit_RestClientV5.openANewPosition({
            orderParams: {
                category:"linear",
                orderType:"Market",
                qty:String(standardized_qty),//String(symbolInfo.lot_size_filter.min_trading_qty),
                side: position.direction==="LONG"?"Buy":"Sell",
                symbol: position.pair,
                positionIdx:position.direction==="LONG"?1:2, //Used to identify positions in different position modes. Under hedge-mode, this param is required 0: one-way mode  1: hedge-mode Buy side 2: hedge-mode Sell side
            }
        });
        // const arrayWithQuantitiesLeftToExecute = sizesToExecute;
        console.log({openPositionRes});
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
        // const getOrderHistory_Res2 = await bybit.clients.bybit_RestClientV5.getPositionInfo_Realtime({
        //     category: "linear",
        //     settleCoin:"USDT",
        //     // orderId: updatePositionRes.result.orderId
        // });
        // if (Object.keys(getOrderHistory_Res2.result).length === 0) throw new Error("getOrderHistory_Res2: "+getOrderHistory_Res2.retMsg);
        // const orderObject2 = getOrderHistory_Res2.result.list.find((accountOrderV5_) => {
        //     if(accountOrderV5_.symbol===position.pair && accountOrderV5_.side===(position.direction==="LONG"?"Buy":"Short")){
        //         return accountOrderV5_;
        //     }
        // });
        // if (!orderObject2) throw new Error("updated orderObject not found in order history");
        // console.log({ orderObject2 });
    
        // const roi = ()=>{
        //     const currentValue = parseFloat(orderObject2.positionValue);
        //     const positionSize = parseFloat(orderObject2.size);
        //     const averageEntryPrice = parseFloat(orderObject2.avgPrice);

        //     const initialCost = positionSize * averageEntryPrice;
        //     const roi = (currentValue - initialCost) / initialCost;
 
        //     return roi;
        // };
        // update the TradedTrades db document
        console.log({tradedPositionObj});
        await mongoDatabase.collection.tradedPositionsCollection.
            updateDocument(tradedPositionObj._id, {
                close_price: parseFloat(orderInExchange.price),
                closed_pnl: tradedPositionObj.closed_pnl,//bybit.calculateAccountActiveOrderPNL(orderObject2),
                closed_roi_percentage: tradedPositionObj.closed_roi_percentage, //bybit.calculateAccountActiveOrderROI(orderObject2),
                entry_price: tradedPositionObj.entry_price,
                leverage: parseFloat(String(tradedPositionObj.leverage)),
                pair: position.pair,
                position_id_in_oldTradesCollection: undefined,
                position_id_in_openTradesCollection: position._id,
                server_timezone: process.env.TZ,
                size: tradedPositionObj.size + parseFloat(orderInExchange.cumExecQty),
                status: "OPEN",
                trader_uid: trader.uid,
                trader_username: trader.username,
                traded_value: tradedPositionObj.traded_value + parseFloat(orderInExchange.cumExecValue),
                document_last_edited_at_datetime: new Date(),
            });
        // updateDocument(tradedPositionObj._id, {
        //     close_price: parseFloat(orderObject2.price),
        //     closed_pnl: bybit.calculateAccountActiveOrderPNL(orderObject2),
        //     closed_roi_percentage: bybit.calculateAccountActiveOrderROI(orderObject2),
        //     entry_price: tradedPositionObj.entry_price,
        //     leverage: parseFloat(String(tradedPositionObj.leverage)),
        //     pair: position.pair,
        //     position_id_in_oldTradesCollection: undefined,
        //     position_id_in_openTradesCollection: position._id,
        //     server_timezone: process.env.TZ,
        //     size: standardized_qty,//parseFloat(orderObject2.qty),
        //     status: "OPEN",
        //     trader_uid: trader.uid,
        //     trader_username: trader.username,
        //     traded_value: tradedPositionObj.traded_value + parseFloat(orderObject2.cumExecValue),
        //     document_last_edited_at_datetime: new Date(),
        //     order_id: updatePositionRes.result.orderId
        // });
        // updateDocument(tradedPositionObj._id, {
        //     close_price: parseFloat(orderObject2.markPrice),
        //     closed_pnl: parseFloat(orderObject2.unrealisedPnl),//bybit.calculateAccountActiveOrderPNL(orderObject2),
        //     closed_roi_percentage: roi(),
        //     entry_price: tradedPositionObj.entry_price,
        //     leverage: parseFloat(String(tradedPositionObj.leverage)),
        //     pair: position.pair,
        //     position_id_in_oldTradesCollection: undefined,
        //     position_id_in_openTradesCollection: position._id,
        //     server_timezone: process.env.TZ,
        //     size: standardized_qty,//parseFloat(orderObject2.qty),
        //     status: "OPEN",
        //     trader_uid: trader.uid,
        //     trader_username: trader.username,
        //     traded_value: tradedPositionObj.traded_value + parseFloat(orderObject2.positionValue),
        //     document_last_edited_at_datetime: new Date(),
        //     order_id: updatePositionRes.result.orderId
        // });
        logger.info("Updated position in tradedPositionCollection db");

    }catch(error){
        const newErrorMessage = `user:${user.tg_user_id} (fn:handler) ${error.message}`;
        error.message = newErrorMessage;
        onErrorCb(error);
        // throw error;
    }

    


}




