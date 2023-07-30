//@ts-check

/**
 * @param {{
 *      bybit: import("../Bybit").Bybit,
 *      symbol: string,
 *      side: "Buy" | "Sell" | "None",
 *      category: import("bybit-api").CategoryV5,
 * }} param0
 */
module.exports.getActualOpenPositionInBybit = async function({
    bybit,category,symbol,side
}){
    const FUNCTON_NAME = "(fn:getActualOpenPositionInBybit)";
    try{

        // await sleepAsync(20000);
        
        /**
     * Get the position
     */
        const getOpenPosition_Result =  await bybit.clients.bybit_RestClientV5.getPositionInfo_Realtime({
            category,
            // settleCoin:"USDT"
            symbol: symbol,
            
        });

        if(getOpenPosition_Result.retCode!==0)throw new Error(`getOpenPosition_Result: ${getOpenPosition_Result.retMsg}`);
        // console.log({getOpenPosiion_Result});
        const theTradeInBybit = getOpenPosition_Result.result.list.find((p)=>{
            console.log({
                p
            });
            if(
                p.side===(side)
                &&
                p.symbol===symbol
                &&
                p.size!=="0"
            ){
                return p;
            }
        });

        if(!theTradeInBybit)throw new Error(`(getOpenPosition_Result) theTradeInBybit is ${theTradeInBybit}`);
        return theTradeInBybit;
    }catch(error){
        error.message = `${FUNCTON_NAME} ${error.message}`;
        throw error;
    }
};