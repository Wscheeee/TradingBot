//@ts-check
const { DecimalMath } = require("../../DecimalMath");
const {Bybit} = require("../../Trader");

const { newPositionSizingAlgorithm } = require("./algos/qty");

 
/**
 * 
 * @param {{
*      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
*      logger: import("../../Logger").Logger,
*      positionsStateDetector: import("../../MongoDatabase").PositionsStateDetector,
*      onErrorCb:(error:Error)=>any
* }} param0 
*/
module.exports.positionUpdateHandler = async function positionUpdateHandler({
    logger, mongoDatabase, positionsStateDetector,onErrorCb
}) {
    console.log("fn:positionUpdateHandler");
    positionsStateDetector.onUpdatePosition(async (previousPositionDocument,position, trader) => {
        logger.info("Position updated On DB");
        try {
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
                try{
                    
                    promises.push(handler({
                        logger,
                        mongoDatabase,
                        position,
                        trader,
                        user,
                        onErrorCb:(error)=>{
                            const newErrorMessage = `(fn:positionUpdateHandler)  trader :${trader.username}) and user :(${user.tg_user_id}) ${error.message}`;
                            error.message = newErrorMessage;
                            onErrorCb(error);
                        }
                    }));

                }catch(error){
                    // Error thrown only for user but loop not to be stopped
                    const newErrorMessage = `(fn:positionUpdateHandler) trader :${trader.username}) and user :(${user.tg_user_id}) ${error.message}`;
                    error.message = newErrorMessage;
                    onErrorCb(error);
                }

            }
            await Promise.allSettled(promises);



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
*      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
*      logger: import("../../Logger").Logger,
*      position: import("../../MongoDatabase/collections/open_trades/types").OpenTrades_Collection_Document_Interface,
*      trader: import("../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface,
*      user: import("../../MongoDatabase/collections/users/types").Users_Collection_Document_Interface,
*      onErrorCb:(error:Error)=>any
* }} param0 
*/
async function handler({ 
    logger,mongoDatabase,position,trader,user,onErrorCb
}){
    try {
        /////////////////////////////////////////////
        /**
         * Connect to user Bybit SubAccount Account
         */
        const subAccountDocument = await mongoDatabase.collection.subAccountsCollection.findOne({
            tg_user_id: user.tg_user_id, 
            trader_uid: trader.uid,
            testnet: user.testnet 
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
    
        /**
         * Get the position
         */
        const getOpenPosition_Result =  await bybit.clients.bybit_RestClientV5.getPositionInfo_Realtime({
            category:"linear",
            // settleCoin:"USDT"
            symbol: position.pair,
            
        });

        if(getOpenPosition_Result.retCode!==0)throw new Error(`getOpenPosition_Result: ${getOpenPosition_Result.retMsg}`);
        // console.log({getOpenPosiion_Result});
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


        

        /**
         * Calculate the updated qty
         */
        // logger.info("Calculate percentageBased_DynamicPositionSizingAlgo");
        const {sizesToExecute, symbolLotStepSize, symbolMaxLotSize} = await newPositionSizingAlgorithm({
            bybit,
            position,
            trader,
            mongoDatabase,
            action:"trade_close",
            user
        });
        const sizeToExecute = sizesToExecute[0];
        console.log({sizesToExecute,sizeToExecute});
        
        if(sizeToExecute===0||!sizeToExecute)throw new Error("sizeToExecute==="+sizeToExecute);
        const total_standardized_qty = sizesToExecute.reduce((a,b)=>a+b,0);
        console.log({total_standardized_qty});

        if(parseFloat(theTradeInBybit.size)<total_standardized_qty){
            console.log("Position Size increased");
            // Means that size was added
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

            console.log({someCloseIsSucccessful});


            
       

        }else {
            console.log("Only Leverage was updated");
        }


    
        // logger.info("Sending an order to update the position at bybit_RestClientV5");
        // const updatePositionRes = await bybit.clients.bybit_RestClientV5.updateAPosition({ 
        //     category: "linear",
        //     orderId: tradedPositionObj.order_id,
        //     symbol: position.pair,
        //     qty: String(standardized_qty),
        // });
        // console.log({ updatePositionRes:updatePositionRes.result });
        // if (!updatePositionRes || !updatePositionRes.result || !updatePositionRes.result.orderId) {
        //     throw new Error(updatePositionRes.retMsg);
        // }
        // logger.info("Updated the position at bybit_RestClientV5");
    
        /**
         * Get the position again
         */
        const getOpenPosition_Result_again =  await bybit.clients.bybit_RestClientV5.getPositionInfo_Realtime({
            category:"linear",
            // settleCoin:"USDT"
            symbol: position.pair,
        
        });

        if(getOpenPosition_Result_again.retCode!==0)throw new Error(`getOpenPosition_Result_again: ${getOpenPosition_Result_again.retMsg}`);
        // console.log({getOpenPosiion_Result});
        const theTradeInBybit_again = getOpenPosition_Result_again.result.list.find((p)=>{
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

        if(!theTradeInBybit_again)throw new Error(`(getOpenPosition_Result_again) theTradeInBybit_again is ${theTradeInBybit_again}`);
    
    
        // update the TradedTrades db document
        await mongoDatabase.collection.tradedPositionsCollection.
            updateDocument(tradedPositionObj._id, {
                // close_price: parseFloat(orderObject2.price),
                // closed_pnl: bybit.calculateAccountActiveOrderPNL(orderObject2),
                // closed_roi_percentage: bybit.calculateAccountActiveOrderROI(orderObject2),
                // entry_price: tradedPositionObj.entry_price,
                leverage: parseFloat(String(tradedPositionObj.leverage)),
                // pair: position.pair,
                // position_id_in_oldTradesCollection: undefined,
                // position_id_in_openTradesCollection: position._id,
                server_timezone: process.env.TZ,
                size: parseFloat(theTradeInBybit_again.size),
                // status: "OPEN",
                // trader_uid: trader.uid,
                // trader_username: trader.username,
                // traded_value: tradedPositionObj.traded_value + parseFloat(theTradeInBybit_again.positionValue),
                traded_value: (new DecimalMath(parseFloat(theTradeInBybit_again.positionValue)).divide(parseFloat(theTradeInBybit_again.leverage||String(position.leverage)))).getResult(),
                document_last_edited_at_datetime: new Date(),
                // order_id: updatePositionRes.result.orderId
            });
        logger.info("Updated position in tradedPositionCollection db");

    }catch(error){
        const newErrorMessage = `user:${user.tg_user_id} (fn:handler) ${error.message}`;
        error.message = newErrorMessage;
        onErrorCb(error);
        // throw error;
    }

    


}




