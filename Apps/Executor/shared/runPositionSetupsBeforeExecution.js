//@ts-check
"use-srict";

/**
 * 
 * @param {{
 *    bybit: import("../../../Trader").Bybit,
 *    logger: import("../../../Logger").Logger,
 *    position: import("../../../MongoDatabase/collections/open_trades/types").OpenTrades_Collection_Document_Interface,
 * }} param0 
 */
module.exports.runPositionSetupsBeforeExecution = async ({bybit,logger,position})=>{
    const FUNCTION_NAME = "(fn:runPositionSetupsBeforeExecution)";
    console.log(FUNCTION_NAME);
    try {
        // Switch position mode
        const switchPositionMode_Res = await bybit.clients.bybit_RestClientV5.switchPositionMode({
            mode:3, //Position mode. 0: Merged Single. 3: Both Sides
            symbol: position.pair,
            category:"linear"
        });
        if(switchPositionMode_Res.retCode!==0){
            // an error
            logger.error("switchPositionMode_Res: "+""+switchPositionMode_Res.retMsg);
        }

        /**
                    * Switch Margin
                    */
        const switchMarginToCrossOrIsolated_Resp = await bybit.clients.bybit_RestClientV5.switchMarginToCrossOrIsolated({
            // is_isolated: false,
            // buy_leverage:1,
            // sell_leverage:1,
            // symbol: position.pair,
            buyLeverage: String(position.leverage),
            sellLeverage: String(position.leverage),
            category:"inverse",
            symbol:position.pair,
            tradeMode: 1//0: cross margin. 1: isolated margin

        });
        if(switchMarginToCrossOrIsolated_Resp.retCode!==0){
            // an error
            logger.error("switchMarginToCrossOrIsolated_Resp: "+""+switchMarginToCrossOrIsolated_Resp.retMsg+"("+position.pair+")");
        }
        /**
                    * Seet User Leverage
                    */
        const setUserLeverage_Res = await bybit.clients.bybit_RestClientV5.setUserLeverage({
            buyLeverage: String(position.leverage),
            sellLeverage: String(position.leverage),
            symbol: position.pair,
            category:"linear"
        });
        if(setUserLeverage_Res.retCode!==0){
            // an error
            logger.error("setUserLeverage_Res: "+""+setUserLeverage_Res.retMsg+"("+position.pair+")");
        }
        logger.info("Sending openANewPosition Order to bybit_RestClientV5");
    }catch(error){
        error.message = `${FUNCTION_NAME} ${error.message}`;
        throw error;
    }

};