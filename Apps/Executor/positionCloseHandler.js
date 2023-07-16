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
module.exports.positionCloseHandler = async function positionCloseHandler({
    logger,mongoDatabase,positionsStateDetector,onErrorCb
}){
    console.log("fn:positionCloseHandler");
    positionsStateDetector.onPositionClose(async (position, trader) => {
        logger.info("Position closed On DB");
        try{

            /****
             * Get all users cursor
             * 
             */
            const users_Cursor = await mongoDatabase.collection.usersCollection.getAllDocumentsBy({
                status:true
            });
            const users_array = await users_Cursor.toArray();
            const promises = [];
            for(const user of users_array){
                try{
                   
                    promises.push(handler({
                        // bybit:bybitSubAccount,
                        logger,
                        mongoDatabase,
                        position,
                        trader, 
                        user,
                        onErrorCb:(error)=>{
                            const newErrorMessage = `(fn:positionCloseHandler)  trader :${trader.username}) and user :(${user.tg_user_id}) ${error.message}`;
                            error.message = newErrorMessage;
                            onErrorCb(error);
                        }
                    }));
                
                    
                }catch(error){
                    // Error thrown only for user but loop not to be stopped
                    const newErrorMessage = `(fn:positionCloseHandler) trader :${trader.username}) and user :(${user.tg_user_id}) ${error.message}`;
                    error.message = newErrorMessage;
                    onErrorCb(error);
                }
            }
            await Promise.allSettled(promises);

            
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
*      mongoDatabase: import("../../MongoDatabase").MongoDatabase,
*      logger: import("../../Logger").Logger,
*      position: import("../../MongoDatabase/collections/open_trades/types").OpenTrades_Collection_Document_Interface,
*      trader: import("../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface,
*      user: import("../../MongoDatabase/collections/users/types").Users_Collection_Document_Interface,
*      onErrorCb:(error:Error)=>any
*}} param0 
*/
async function handler({
    logger,mongoDatabase,position,trader,user,onErrorCb
}){
    try {
        /////////////////////////////////////////////

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



        ////////////////////////////////////////////
        const bybit = bybitSubAccount;

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
     * Close the order
     */
    
        const {closePositionsRes} = await bybit.clients.bybit_RestClientV5.closeAPosition({
            orderParams:{
                category:"linear",
                orderType:"Market",
                qty:String(total_standardized_qty),//String(position.size),// close whole position
                side: position.direction==="LONG"?"Sell":"Buy",
                symbol: position.pair,
                positionIdx: position.direction==="LONG"?1:2,
            },
            symbolLotStepSize, 
            symbolMaxLotSize
        });
        console.log({closePositionsRes});
        let someCloseIsSucccessful = false;
        const closedPositionAccumulatedDetails = {
            closedPNL:0,
            avgExitPrice: 0,
            leverage: 0,
            qty: 0,
            close_datetime:new Date(),
            averageEntryPrice: 0,
            positionCurrentValue: 0,
            tradedValue:0
        };
        // Loop through closePositionsRes 
        for (const closePositionResObj of closePositionsRes){
            const closePositionRes = closePositionResObj.response;
            if(closePositionRes.retCode!==0){
                // throw new Error(closePositionRes.retMsg);
                //instead send error message 
                logger.error("closePositionRes:"+closePositionRes.retMsg);
            }else {
                someCloseIsSucccessful = true;
                logger.info("Position closed on bybit_RestClientV5");
                logger.info("Get closed position info");
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
        
                const getClosedPositionInfo_res = await bybit.clients.bybit_RestClientV5.getClosedPositionInfo({
                    category:"linear",
                    orderId:closePositionRes.result.orderId
                
                });
                console.log({
                    getClosedPositionInfo_res: getClosedPositionInfo_res.result.list
                });
        
                ///////////////////////////////////////////////////
        
                
                const closedPartialPNL_res = await bybit.clients.bybit_RestClientV5.getClosedPositionPNL({
                    category:"linear",
                    symbol:position.pair,
                });
                // orderId: '07d2a19c-7148-453a-b4d9-fa0f17b5746c'
                console.log({closedPartialPNL_res});
                if(!closedPartialPNL_res.result ||closedPartialPNL_res.result.list.length===0){
                    logger.error("Position partial expected to be closed , it's close PNL not found.");
                }
                console.log({closedPartialPNL_res: closedPartialPNL_res.result});
                const closedPositionPNLObj = closedPartialPNL_res.result.list.find((closedPnlV5) => closedPnlV5.orderId===closePositionRes.result.orderId );
            
                if(!closedPositionPNLObj)throw new Error("closedPositionPNLObj not found for closed partial position:");
            
                let closedPartialPNL  = parseFloat(closedPositionPNLObj.closedPnl);
                closedPositionAccumulatedDetails.closedPNL+=closedPartialPNL;
                closedPositionAccumulatedDetails.avgExitPrice =  parseFloat(closedPositionPNLObj.avgExitPrice);
                closedPositionAccumulatedDetails.leverage =  parseFloat(closedPositionPNLObj.leverage);
                closedPositionAccumulatedDetails.qty +=  parseFloat(closedPositionPNLObj.qty);
                closedPositionAccumulatedDetails.close_datetime =  new Date(parseFloat(closedPositionPNLObj.updatedTime));
                closedPositionAccumulatedDetails.averageEntryPrice =  parseFloat(closedPositionPNLObj.avgEntryPrice);
                closedPositionAccumulatedDetails.positionCurrentValue +=  parseFloat(closedPositionPNLObj.cumExitValue);
                closedPositionAccumulatedDetails.tradedValue +=  parseFloat(closedPositionPNLObj.cumExitValue);
            }

        }
 
        console.log({someCloseIsSucccessful});
        if(!someCloseIsSucccessful){
            logger.error("None of the close position was successfull");
            return;
        }

        console.log({closedPositionAccumulatedDetails});
    
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
                    close_price: closedPositionAccumulatedDetails.avgExitPrice,
                    closed_pnl: closedPositionAccumulatedDetails.closedPNL,
                    closed_roi_percentage: bybit.calculateClosedPositionROI({
                        averageEntryPrice: closedPositionAccumulatedDetails.averageEntryPrice,
                        positionCurrentValue:  closedPositionAccumulatedDetails.positionCurrentValue,
                        positionSize: closedPositionAccumulatedDetails.qty
                    }),
                    leverage: closedPositionAccumulatedDetails.leverage,
                    position_id_in_oldTradesCollection: position._id,
                    size: closedPositionAccumulatedDetails.qty,
                    status: "CLOSED",
                    close_datetime: closedPositionAccumulatedDetails.close_datetime,
                    document_last_edited_at_datetime: new Date(),
                });
            logger.info("Closed position in tradedPositionCollection db");
        }

    }catch(error){
        const newErrorMessage = `user:${user.tg_user_id} (fn:handler) ${error.message}`;
        error.message = newErrorMessage;
        onErrorCb(error);
        // throw error;
    }

    

}



// module.exports.positionCloseHandler_HANDLER = handler;