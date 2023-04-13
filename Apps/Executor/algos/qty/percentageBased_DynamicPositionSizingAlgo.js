const {DecimalMath} = require("../../../../DecimalMath");


/**
 * 
 * @param {{
*      bybit: import("../../../../Trader").Bybit,
*      trader: import("../../../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface,
*      position: import("../../../../MongoDatabase/collections/open_trades/types").OpenTrades_Interface
* }} param0 
*/
module.exports.percentageBased_DynamicPositionSizingAlgo = async function percentageBased_DynamicPositionSizingAlgo({
    bybit,position,trader
}){
    console.log("fn:percentageBased_DynamicPositionSizingAlgo");
    // get account balance
    /**
             *  - (METHOD: Get Single Coin Balance) check the total 
             * USDT balance of the user’s account (Total Balance)
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
    /**
             * - (METHOD: Get Positions Info) check the total value of 
             * the open positions at the time it was opened (Open Balance)
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
             * - Check the Trader’s Weight
             */
    const traderWeight = trader.weight||1;

    /**
             * - calculate the trade allocation based on :
             */
    // - Total Balance - Open Balance = Available Balance
    const availableBalance = new DecimalMath(totalUSDT_balance).subtract(totalValueOfTheOpenPositions).getResult();
    console.log({availableBalance});
    // - Open Balance / Total Balance * 100 = % of Open Balance
    const percentageOfOpenBalace = new DecimalMath(totalValueOfTheOpenPositions).divide(totalUSDT_balance).multiply(100).getResult();
    console.log({percentageOfOpenBalace});
    // - % of Open Balance should never be more than 80%, 
    // if its more than 80 don’t execute the trade ( 20% of reserved balance )
    if(percentageOfOpenBalace>=80){
        throw new Error(`percentage of open balance exceeds 80% threshold: (percentageOfOpenBalace = ${percentageOfOpenBalace})`);
    }
    // - Total Balance = 100%
    // - Max Open Balance = 80%
    // - Traders Total Balance = 50%

    /**
             * - calculate trader’s allocated % balance, for example Trader Weight = 0,4 so :
             *   - 0,4 x 50 = 20
             *  - 20 is the trader’s allocated % balance on the Total Balance (100%)
             */
    const traderAllocatedPercentageBalance = new DecimalMath(traderWeight).multiply(50).getResult();

    /**
             * - Now calculate the trades allocation %
             */
    // - Get the Averages of the trader
    const {average_concurrent_trades:traders_average_concurrent_trades,average_trade_count_value:traders_average_trade_value} = trader;
    if(!traders_average_trade_value)throw new Error(`Cannot execute the trader's position:traders average_trade_count_value value if not available: (traders_average_trade_size: ${traders_average_trade_value}) (trader: ${trader.username})`);
    const average_concurrent_trades = traders_average_concurrent_trades||10;
    const average_trade_size = new DecimalMath(traders_average_trade_value).divide(position.mark_price).getResult();
    /**
             * - Calculate the average % allocation per trade :
             * - 100/Average number of concurrent trades
             */
    const averagePercentageAllocationPerTrade = new DecimalMath(100).divide(average_concurrent_trades).getResult();

    /**
             *  - Get the trade size + entry price + leverage
             * - Calculate Trade Value = (Size * Entry price) / Leverage
             */
    const tradeValue = new DecimalMath(position.size).multiply(position.entry_price).divide(position.leverage).getResult();

    /**
             * - Calculate Trade Allocation % by doing :
             * - Difference = ((Trade Value - Average Trade Size) / Average Trade Size)
             * - If Difference is negative, make it positive
             * - Trade Allocation % = average % allocation per trade * Difference
             */
    const difference = Math.abs(new DecimalMath(tradeValue).subtract(average_trade_size).divide(average_trade_size).getResult());
    const tradeAllocationPercentage = new DecimalMath(averagePercentageAllocationPerTrade).multiply(difference).getResult();

    /**
             *  - Convert that Trade Allocation % to a real size :
             * - Traders Allocated Balance = (trader’s allocated % balance * Total Balance) / 100
             */
    const traderAllocatedBalance = new DecimalMath(traderAllocatedPercentageBalance).multiply(totalUSDT_balance).divide(100).getResult();
    //- qty =  Traders Allocated Balance * (Trade Allocation %/100)
    const qty = new DecimalMath(traderAllocatedBalance).multiply(new DecimalMath(tradeAllocationPercentage).divide(100).getResult()).getResult();
    // END
    console.log({
        traderAllocatedBalance,
        tradeAllocationPercentage,
        average_concurrent_trades,
        average_trade_size,
        tradeValue,
        difference,
        averagePercentageAllocationPerTrade,
        qty
    });
            
    const qtyToByWith = qty;
    // standardize the qty
    const standardizedQTY = await bybit.standardizeQuantity({quantity:qtyToByWith,symbol:position.pair});
    console.log({standardizedQTY});
    return {standardized_qty:standardizedQTY,trade_allocation_percentage:tradeAllocationPercentage};
};