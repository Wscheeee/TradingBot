// closeAnAccountAllOpenPositions.js.js


// /**
//  * 
//  * @param {{
// *    private_api: string,
// *    public_api: string,
// *    testnet: boolean
// * }} param0     
// * @returns 
// */
// async function getOpenOrders({
//     private_api,public_api,testnet
// }){
//     console.log("Getting: getOpenOrders");
//     const bybitSubAccount = new Bybit({
//         millisecondsToDelayBetweenRequests: 1000,//5000,
//         privateKey: private_api,
//         publicKey: public_api,
//         testnet: testnet===false?false:true
//     });

    
//     console.log("Got: getOpenOrders");
//     return orders.result.list;
// }
/**
 * 
 * @param {{
 *      bybit: import("../../Trader/Bybit").Bybit
 *}} param0 
 */
module.exports.closeAllPositionsInASubAccount = async function closeAllPositionsInASubAccount({bybit}){
    try{
        // Get open orders
        const ordersResponse = await bybit.clients.bybit_RestClientV5.getPositionInfo_Realtime({category:"linear",settleCoin:"USDT"});
        const orders = ordersResponse.result.list;
        for(const order of orders){
            const {side,size,symbol} = order;
            // close 
           
            const closeAPositionRes = await bybit.clients.bybit_RestClientV5.closeAPosition({
                category:"linear",
                orderType:"Market",
                qty:String(size),//String(position.size),// close whole position
                side: side=="Buy"?"Sell":"Buy",//LONG"?"Sell":"Buy",
                symbol,
                positionIdx: side==="Buy"?1:2,
            });
            console.log({closeAPositionRes});
            if(closeAPositionRes.retCode===0){
                // successfull
                
            }
        }
        
    }catch(error){
        const newErrorMessage = `(fn:closeAnAccountAllOpenPositions) ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};