//@ts-check
"use-srict";

/**
 * 
 * @param {{
 *    bybit: import("../../../Trader").Bybit,
 *    position: import("../../../MongoDatabase/collections/open_trades/types").OpenTrades_Collection_Document_Interface,
 *    onError:(error:Error)=>any
 * }} param0 
 */
module.exports.runPositionSetupsBeforeExecution = async ({bybit,position,onError})=>{
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
            // logger.error("switchPositionMode_Res: "+""+switchPositionMode_Res.retMsg);
            onError(new Error("switchPositionMode_Res: "+""+switchPositionMode_Res.retMsg));
        } 

        /**
                    * Switch Margin
                    */
        //@ts-ignore  
        const switchMarginToCrossOrIsolated_Resp = await bybit.clients.bybit_RestClientV5.setMarginMode("ISOLATED_MARGIN");
        if(switchMarginToCrossOrIsolated_Resp.retCode!==0){
            // an errorr
            const constructReasonsMessage = ()=>{
                let msg = "";
                if(switchMarginToCrossOrIsolated_Resp.result && switchMarginToCrossOrIsolated_Resp.result.reasons && Array.isArray(switchMarginToCrossOrIsolated_Resp.result.reasons)){
                    switchMarginToCrossOrIsolated_Resp.result.reasons.forEach(r=>{
                        msg += r.reasonMsg;
                    });

                }
                return msg;
            };
            

            // logger.error("switchMarginToCrossOrIsolated_Resp: "+""+switchMarginToCrossOrIsolated_Resp.retMsg+"("+position.pair+")"+switchMarginToCrossOrIsolated_Resp.result.reasons.map(r=>r.reasonMsg).join(", "));
            onError(new Error("switchMarginToCrossOrIsolated_Resp: "+""+switchMarginToCrossOrIsolated_Resp.retMsg+"("+position.pair+")"+ constructReasonsMessage()));
        }
        /**
                    * Set User Leverage
                    */
        const setUserLeverage_Res = await bybit.clients.bybit_RestClientV5.setUserLeverage({
            buyLeverage: String(position.leverage),
            sellLeverage: String(position.leverage),
            symbol: position.pair,
            category:"linear"
        });
        if(setUserLeverage_Res.retCode!==0){
            // an error
            // logger.error("setUserLeverage_Res: "+""+setUserLeverage_Res.retMsg+"("+position.pair+")");
            onError(new Error("setUserLeverage_Res: "+""+setUserLeverage_Res.retMsg+"("+position.pair+")"));
        }
        // logger.info("Sending openANewPosition Order to bybit_RestClientV5");
    }catch(error){
        error.message = `${FUNCTION_NAME} ${error.message}`;
        throw error;
    }

};