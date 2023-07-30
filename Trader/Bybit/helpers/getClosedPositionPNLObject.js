//@ts-check

const {sleepAsync} = require("../../utils/sleepAsync");

/**
 * @param {{
 *      bybit: import("../Bybit").Bybit,
 *      symbol: string,
 *      category: import("bybit-api").CategoryV5,
 *      closedPositionOrderId: string
 * }} param0
 */
module.exports.getClosedPositionPNLObject = async function({
    bybit,category,symbol,closedPositionOrderId
}){
    const FUNCTON_NAME = "(fn:getClosedPositionPNLObject)";
    try{

        await sleepAsync(20000);
        
        ///////////////////////////////////////////////////
        // const orderHistory_Res = await bybit.clients.bybit_RestClientV5.getOrderHistory({
        //     category:"linear",
        //     symbol: position.pair,
        //     // orderId: closePositionRes.result.orderId
        // });
        // if(orderHistory_Res.retCode!==0)throw new Error("orderHistory_Res: "+orderHistory_Res.retMsg);
        // const orderInfoObj = orderHistory_Res.result.list.find((order)=>order.orderId===closePositionRes.result.orderId);
        // if(!orderInfoObj)throw new Error("orderInfoObj not found in history");
        // console.log({orderInfoObj});


        
        const closedPartialPNL_res = await bybit.clients.bybit_RestClientV5.getClosedPositionPNL({
            category:category,
            symbol:symbol,
        });
        // orderId: '07d2a19c-7148-453a-b4d9-fa0f17b5746c'
        console.log({closedPartialPNL_res});
        if(!closedPartialPNL_res.result ||closedPartialPNL_res.result.list.length===0){
            // onError(new Error("Position Resize Error: Position partial expected to be closed , it's close PNL not found."));
            throw new Error("Position Resize Error: Position partial expected to be closed , it's close PNL not found.");
        }
        console.log({closedPartialPNL_res: closedPartialPNL_res.result});
        let closedPositionPNLObj = closedPartialPNL_res.result.list.find((closedPnlV5) => closedPnlV5.orderId===closedPositionOrderId );
    
    
        if(!closedPositionPNLObj){ 
            //retry
            console.log("Retry getClosedPositionPNL");
            await sleepAsync(20000);
            const closedPartialPNL_res2 = await bybit.clients.bybit_RestClientV5.getClosedPositionPNL({
                category,
                symbol:symbol,
            });
            // orderId: '07d2a19c-7148-453a-b4d9-fa0f17b5746c'
            console.log({closedPartialPNL_res2});
            if(!closedPartialPNL_res2.result ||closedPartialPNL_res2.result.list.length===0){
                // onError(new Error("Position Resize Error: Position partial expected to be closed , it's close PNL not found."));
                throw new Error("Position Resize Error: Position partial expected to be closed , it's close PNL not found.");
            }
            console.log({closedPartialPNL_res2: closedPartialPNL_res2.result});
            closedPositionPNLObj = closedPartialPNL_res2.result.list.find((closedPnlV5) => closedPnlV5.orderId===closedPositionOrderId );

            if(!closedPositionPNLObj){
                throw new Error("Trade Close Executed but PNL query  Error: closedPositionPNLObj not found for closed partial position");

            }
        }
        return closedPositionPNLObj;
    }catch(error){
        error.message = `${FUNCTON_NAME} ${error.message}`;
        throw error;
    }
};