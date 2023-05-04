//@ts-check

const {Bybit} = require("../../Trader");

const {newPositionSizingAlgorithm} = require("./algos/qty");

/**
 * 
 * @param {{
*      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
*      logger: import("../../Logger").Logger,
*      positionsStateDetector: import("../../MongoDatabase").PositionsStateDetector
* }} param0 
*/
module.exports.positionCloseHandler = async function positionCloseHandler({
    logger,mongoDatabase,positionsStateDetector
}){
    console.log("fn:positionCloseHandler");
    positionsStateDetector.onPositionClose(async (position, trader) => {
        logger.info("Position closed On DB");
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
                // Login to user's sub account of this trader
                const subAccountDocument = await mongoDatabase.collection.subAccountsCollection.findOne({
                    tg_user_id: user.tg_user_id,
                    trader_uid: trader.uid,
                    testnet: user.testnet 
                });
                if(!subAccountDocument) throw new Error(`No SubAccount found in subAccountDocument for trader :${trader.username}) and user :(${user.tg_user_id}) `);
                const bybitSubAccount = new Bybit({
                    millisecondsToDelayBetweenRequests: 5000,
                    privateKey: subAccountDocument.private_api,
                    publicKey: subAccountDocument.public_api,
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

        }catch(error){
            console.log({error});
            let errorMsg = "(fn:positionCloseHandler) "+(error && error.message?error.message:"");
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
    try {
        /**
                 * Get the open tradersPositions in DB
                 */
        const tradedPositionObj = await mongoDatabase.collection.tradedPositionsCollection.findOne({
            status:"OPEN",
            pair: position.pair,
            direction: position.direction,
            leverage: position.leverage,
            trader_uid: trader.uid,
            tg_user_id: user.tg_user_id,
            testnet: user.testnet
        });
        if(!tradedPositionObj){
            throw new Error("Position setting out to close was never trades/open");
        }
    
        /**
     * Get the qty of the partial to close
    **/
        const {sizeToExecute} = await newPositionSizingAlgorithm({
            bybit,
            position,
            trader,
            mongoDatabase,
            action:"trade_close",
            user
        });
        const standardized_qty = sizeToExecute;
    
        /**
     * Switch position mode
     * */
        const switchPositionMode_Res = await bybit.clients.bybit_LinearClient.switchPositionMode({
            mode:"BothSide",// 3:Both Sides
            symbol:position.pair,
        });
        if(Number(switchPositionMode_Res.ext_code)!==0){
        // an error
            logger.error("switchPositionMode_Res: "+""+switchPositionMode_Res.ret_msg);
        }
    
        // Switch user margin
        const setPositionLeverage_Resp = await bybit.clients.bybit_LinearClient.switchMargin({
            is_isolated: true,
            buy_leverage: 1,
            sell_leverage: 1,
            symbol: position.pair
        });
        if(setPositionLeverage_Resp.ret_code!==0){
        // an error
            logger.error("setPositionLeverage_Resp: "+setPositionLeverage_Resp.ret_msg);
        }
        // Set user leverage
        const setUserLeverage_Res = await bybit.clients.bybit_LinearClient.setUserLeverage({
            buy_leverage: position.leverage,
            sell_leverage: position.leverage,
            symbol: position.pair
        });
        if(setUserLeverage_Res.ret_code!==0){
        // an error
            logger.error("setUserLeverage_Res: "+""+setUserLeverage_Res.ret_msg+"("+position.pair+")");
        }
    
        /**
     * Get the order
     */
        const getOrderHistory_Res = await bybit.clients.bybit_RestClientV5.getOrderHistory({
            category:"linear",
            orderId:tradedPositionObj.order_id
        });
        if(Object.keys(getOrderHistory_Res.result).length===0)throw new Error(getOrderHistory_Res.retMsg);
        const orderObject = getOrderHistory_Res.result.list.find((accountOrderV5_)=> accountOrderV5_.orderId===tradedPositionObj.order_id);
        if(!orderObject)throw new Error("orderObject not found in order history");
        console.log({orderObject});
    
        /**
     * Close the order
     */
    
        const closePositionRes = await bybit.clients.bybit_RestClientV5.closeAPosition({
            category:"linear",
            orderType:"Market",
            qty:String(standardized_qty),//String(position.size),// close whole position
            side: position.direction==="LONG"?"Sell":"Buy",
            symbol: position.pair,
            positionIdx: position.direction==="LONG"?1:2,
        });
        console.log({closePositionRes});
        logger.info("Posion closed on bybit_RestClientV5");
        if(closePositionRes.retCode!==0){
            throw new Error(closePositionRes.retMsg);
        }
        // get the closed position pnl obj
        logger.info("Get closed partial position info");

        ////////////////////////////////////////////////
        /// Added for a little delay

        const getClosedPostionOrderHistory_Res = await bybit.clients.bybit_RestClientV5.getOrderHistory({
            category:"linear",
            symbol: position.pair,
            orderId: closePositionRes.result.orderId
        });
        if(getClosedPostionOrderHistory_Res.retCode!==0)throw new Error(getClosedPostionOrderHistory_Res.retMsg);
        console.log("getClosedPostionOrderHistory_Res");
        console.log(getClosedPostionOrderHistory_Res.result);

        const res = await bybit.clients.bybit_RestClientV5.getClosedPositionInfo({
            category:"linear",
            orderId:closePositionRes.result.orderId
        
        });
        console.log({
            res: res.result
        });

        ///////////////////////////////////////////////////

        
        const closedPartialPNL_res = await bybit.clients.bybit_RestClientV5.getClosedPositionPNL({
            category:"linear",
            symbol:position.pair,
        });
        // orderId: '07d2a19c-7148-453a-b4d9-fa0f17b5746c'
        
        if(!closedPartialPNL_res.result ||closedPartialPNL_res.result.list.length===0){
            logger.error("Position partial expected to be closed , it's close PNL not found.");
        }
        const closedPositionPNLObj = closedPartialPNL_res.result.list.find((closedPnlV5) => closedPnlV5.orderId===closePositionRes.result.orderId );
    
        if(!closedPositionPNLObj)throw new Error("closedPositionPNLObj not found for closed partial position:");
    
        let closedPartialPNL  = parseFloat(closedPositionPNLObj.closedPnl);
    
        // if close is successful // update the traded position db
        const tradedOpenPositionDocument = await mongoDatabase.
            collection.
            tradedPositionsCollection.
            findOne({
                direction:position.direction,
                pair: position.pair,
                trader_uid: trader.uid,
                tg_user_id: user.tg_user_id,
                testnet: user.testnet
            });
        logger.info("Return from mongoDatabase.collection.tradedPositionsCollection.getOneOpenPositionBy");
        if(!tradedOpenPositionDocument){
            logger.warn("Position open in Bybit is not found in DB");
        }else {
            logger.info("Position in Bybit found in DB");
            await mongoDatabase.collection.tradedPositionsCollection.
                updateDocument(tradedOpenPositionDocument._id,{
                    close_price: parseFloat(closedPositionPNLObj.avgExitPrice),
                    closed_pnl: closedPartialPNL,
                    closed_roi_percentage: bybit.calculateClosedPositionROI_fromclosedPnLV5(closedPositionPNLObj),
                    leverage: parseFloat(closedPositionPNLObj.leverage),
                    position_id_in_oldTradesCollection: position._id,
                    size: parseFloat(closedPositionPNLObj.qty),
                    status: "CLOSED",
                    close_datetime: new Date(parseFloat(closedPositionPNLObj.updatedTime)),
                    document_last_edited_at_datetime: new Date(),
                });
            logger.info("Closed position in tradedPositionCollection db");
        }

    }catch(error){
        const newErrorMessage = `user:${user.tg_user_id} (fn:handler) ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }

    

}