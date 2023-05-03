const {Bybit} = require("../../Trader");

const { newPositionSizingAlgorithm } = require("./algos/qty");


/**
 * 
 * @param {{
*      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
*      logger: import("../../Logger").Logger,
*      positionsStateDetector: import("../../MongoDatabase").PositionsStateDetector
* }} param0 
*/
module.exports.positionUpdateHandler = async function positionUpdateHandler({
    logger, mongoDatabase, positionsStateDetector
}) {
    console.log("fn:positionUpdateHandler");
    positionsStateDetector.onUpdatePosition(async (position, trader) => {
        logger.info("Position updated On DB");
        try {
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
                // const bybit = new Bybit({
                //     millisecondsToDelayBetweenRequests: 5000,
                //     privateKey: user.privateKey,
                //     publicKey: user.publicKey,
                //     testnet: true // check
                // });
                const subAccountDocument = await mongoDatabase.collection.subAccountsCollection.findOne({
                    tg_user_id: user.tg_user_id,
                    trader_uid: trader.uid,
                });
                if(!subAccountDocument) throw new Error(`No SubAccount found in subAccountDocument for trader :${trader.username}) and user :(${user.tg_user_id}) `);
                const bybitSubAccount = new Bybit({
                    millisecondsToDelayBetweenRequests: 5000,
                    privateKey: subAccountDocument.private_api,
                    publicKey: subAccountDocument.puplic_api,
                    testnet: subAccountDocument.testnet===false?false:true
                });
                promises.push(handler({
                    bybit:bybitSubAccount,
                    logger,
                    mongoDatabase,
                    position,
                    trader,
                    user
                }));
            }
            await Promise.all(promises);


        } catch (error) {
            console.log({ error });
            let errorMsg = "(fn:positionUpdateHandler) " + (error && error.message ? error.message : "");
            errorMsg += " (" + position.pair + ")";
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
    try {
        /**
         * Check that the position is in db
         * */
        const tradedPositionObj = await mongoDatabase.
            collection.
            tradedPositionsCollection.
            getOneOpenPositionBy({
                direction: position.direction,
                pair: position.pair,
                trader_uid: trader.uid
            });
        logger.info("Return from mongoDatabase.collection.tradedPositionsCollection.getOneOpenPositionBy");
    
        if (!tradedPositionObj) throw new Error("Position to update not in DB meaning itt was not traded");
        logger.info("Position found in db: Working on it");
    
        /**
         * Get the order
         */
        const getOrderHistory_Res = await bybit.clients.bybit_RestClientV5.getOrderHistory({
            category: "linear",
            orderId: tradedPositionObj.order_id
        });
        if (Object.keys(getOrderHistory_Res.result).length === 0) throw new Error(getOrderHistory_Res.retMsg);
        const orderObject = getOrderHistory_Res.result.list.find((accountOrderV5_) => accountOrderV5_.orderId === tradedPositionObj.order_id);
        if (!orderObject) throw new Error("orderObject not found in order history");
        console.log({ orderObject });
    
    
        /**
         * Calculate the updated qty
         */
        logger.info("Calculate percentageBased_DynamicPositionSizingAlgo");
        const { sizeToExecute } = await newPositionSizingAlgorithm({
            bybit,
            position,
            trader,
            mongoDatabase,
            action: "update",
            user
        });
        const standardized_qty = sizeToExecute;
    
        if (standardized_qty == parseFloat(tradedPositionObj.size)) throw new Error("Not updating the position as qty not changed");
        logger.info("qy changed so updating the order");
        /**
         * Switch position mode
         * */
        const switchPositionMode_Res = await bybit.clients.bybit_LinearClient.switchPositionMode({
            mode: "BothSide",// 3:Both Sides
            symbol: position.pair,
        });
        if (switchPositionMode_Res.ext_code !== 0) {
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
        const updatePositionRes = await bybit.clients.bybit_RestClientV5.updateAPosition({
            category: "linear",
            orderId: tradedPositionObj.order_id,
            symbol: position.pair,
            qty: String(standardized_qty),
        });
        if (!updatePositionRes || !updatePositionRes.result || !updatePositionRes.result.orderId) {
            throw new Error(updatePositionRes.retMsg);
        }
        logger.info("Updated the position at bybit_RestClientV5");
        console.log({ updatePositionRes });
    
        /**
         * Get the order again
         */
        const getOrderHistory_Res2 = await bybit.clients.bybit_RestClientV5.getOrderHistory({
            category: "linear",
            orderId: updatePositionRes.result.orderId
        });
        if (Object.keys(getOrderHistory_Res2.result).length === 0) throw new Error(getOrderHistory_Res2.retMsg);
        const orderObject2 = getOrderHistory_Res2.result.list.find((accountOrderV5_) => accountOrderV5_.orderId === updatePositionRes.result.orderId);
        if (!orderObject2) throw new Error("updated orderObject not found in order history");
        console.log({ orderObject2 });
    
    
        // update the TradedTrades db document
        await mongoDatabase.collection.tradedPositionsCollection.
            updateDocument(tradedPositionObj._id, {
                close_price: parseFloat(orderObject2.price),
                closed_pnl: bybit.calculateAccountActiveOrderPNL(orderObject2),
                closed_roi_percentage: bybit.calculateAccountActiveOrderROI(orderObject2),
                entry_price: tradedPositionObj.entry_price,
                leverage: parseFloat(tradedPositionObj.leverage),
                pair: position.pair,
                position_id_in_oldTradesCollection: null,
                position_id_in_openTradesCollection: position._id,
                server_timezone: process.env.TZ,
                size: standardized_qty,//parseFloat(orderObject2.qty),
                status: "OPEN",
                trader_uid: trader.uid,
                trader_username: trader.username,
                traded_value: tradedPositionObj.traded_value + updatePositionRes.cumExecValue,
                document_last_edited_at_datetime: new Date(),
                order_id: updatePositionRes.result.orderId
            });
        logger.info("Updated position in tradedPositionCollection db");

    }catch(error){
        const newErrorMessage = `user:${user.tg_user_id} (fn:handler) ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }

    


}