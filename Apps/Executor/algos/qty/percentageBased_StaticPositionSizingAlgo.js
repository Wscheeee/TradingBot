const {DecimalMath} = require("../../../../DecimalMath");


/**
 * @description Returns qty worth a defined percentage of the total balance
 * @param {{
*      bybit: import("../../../../Trader").Bybit,
*      trader: import("../../../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface,
*      position: import("../../../../MongoDatabase/collections/open_trades/types").OpenTrades_Interface,
*      percentage_of_total_available_balance_to_use_for_position: number
* }} param0 
*/
module.exports.percentageBased_StaticPositionSizingAlgo = async function percentageBased_StaticPositionSizingAlgo({
    bybit,position,trader,percentage_of_total_available_balance_to_use_for_position
}){
    console.log("fn:percentageBased_StaticPositionSizingAlgo");
    /**
     * Get the account balance (total USDT balance) using the Bybit API's getDerivativesCoinBalance method.
     */
    if(position.pair.toLowerCase().includes("usdt")===false){
        throw new Error("Coin does not include usdt: "+position.pair);
    }
    const COIN = "USDT";//position.pair.toLowerCase().replace("usdt","").toUpperCase();
    const accountBalance_Resp =  await bybit.clients.bybit_AccountAssetClientV3.getDerivativesCoinBalance({
        accountType:"CONTRACT",
        coin: COIN
    });
    if(!accountBalance_Resp.result || !accountBalance_Resp.result.balance){
        console.log({accountBalance_Resp});
        throw new Error(accountBalance_Resp.ret_msg);
    }
    const totalUSDT_balance = parseFloat(accountBalance_Resp.result.balance.walletBalance);
    console.log({totalUSDT_balance});

    /**
     * Get the total value of open positions (open balance) using the Bybit API's getOpenPositions method.
     */
    const openPositions_Resp = await bybit.clients.bybit_RestClientV5.getOpenPositions({
        category:"linear",//@todo maybe add more checks
        settleCoin:"USDT"
    });
    if(!openPositions_Resp.result || Object.keys(openPositions_Resp.result).length===0){
        console.log({openPositions_Resp});
        throw new Error(openPositions_Resp.retMsg);
    }
    let totalValueOfTheOpenPositions = 0;
    openPositions_Resp.result.list.forEach((position_)=>{
        totalValueOfTheOpenPositions += parseFloat(position_.positionValue);
    });
    console.log({totalValueOfTheOpenPositions});


    /**
     * Calculate the available balance by subtracting the total value of open positions from the total USDT balance.
     */
    const availableBalance = new DecimalMath(totalUSDT_balance).subtract(totalValueOfTheOpenPositions).getResult();
    console.log({availableBalance});
    /**
     * Check that available balance is not less in percentage that should be left for margin
     */
    // - Open Balance / Total Balance * 100 = % of Open Balance
    const percentageOfOpenBalace = new DecimalMath(totalValueOfTheOpenPositions).divide(totalUSDT_balance).multiply(100).getResult();
    console.log({percentageOfOpenBalace});
    // - % of Open Balance should never be more than 80%, 
    // if its more than 80 don’t execute the trade ( 20% of reserved balance )
    //Check that the percentage of open balance (total value of open positions as a percentage of total USDT balance) is not more than 80%, and throw an error if it exceeds this threshold.
    if(percentageOfOpenBalace>=80){
        throw new Error(`percentage of open balance exceeds 80% threshold: (percentageOfOpenBalace = ${percentageOfOpenBalace})`);
    }
    // - Total Balance = 100%
    // - Max Open Balance < 80%

 
    /**
     * Calculate the trade value (amount to spend/TradeValue) based on the percentage of total available balance to use for the position.
     */
    const tradeValue = new DecimalMath(percentage_of_total_available_balance_to_use_for_position).divide(100).multiply(availableBalance).divide(position.leverage).getResult();
    /**
     * Calculate the quantity (qty) based on the trade value and the mark price of the position.
    */
    //- qty =  position Allocated Balance / (symbol value)
    const qty = new DecimalMath(tradeValue).divide(position.mark_price).getResult();
    /**
     * Calculate the trade allocation percentage (tradeAllocationPercentage) based on the trade value and the total USDT balance.
     */
    const tradeAllocationPercentage = new DecimalMath(tradeValue).multiply(100).divide(totalUSDT_balance).getResult();
   
    // END
    console.log({
        availableBalance,
        percentage_of_total_available_balance_to_use_for_position,
        qty
    });
            
    const qtyToByWith = qty;
    // Standardize the quantity (standardizedQTY) using the Bybit API's standardizeQuantity method.
    const standardizedQTY = await bybit.standardizeQuantity({quantity:qtyToByWith,symbol:position.pair});
    console.log({standardizedQTY});
    //Return the standardized quantity and trade allocation percentage as the result.
    return {standardized_qty:standardizedQTY,trade_allocation_percentage:tradeAllocationPercentage};
};