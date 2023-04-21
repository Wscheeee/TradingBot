const {DecimalMath} = require("../../../../DecimalMath");


/**
 * 
 * @param {{
*      bybit: import("../../../../Trader").Bybit,
*      trader: import("../../../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface,
*      position: import("../../../../MongoDatabase/collections/open_trades/types").OpenTrades_Interface
* }} param0 
*/
async function percentageBased_DynamicPositionSizingAlgo({
    bybit,position,trader
}){
    try{
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
        const openPositions_Resp = await bybit.clients.bybit_RestClientV5.getPositionInfo_Realtime({
            category:"linear",//@todo maybe add more checks
            settleCoin:"USDT"
        });
        if(!openPositions_Resp.result || Object.keys(openPositions_Resp.result).length===0){
            console.log({openPositions_Resp});
            throw new Error(openPositions_Resp.retMsg);
        }
        let totalValueOfTheOpenPositions = 0;
        openPositions_Resp.result.list.forEach((position_)=>{
            totalValueOfTheOpenPositions += new DecimalMath(parseFloat(position_.positionValue)).divide(position_.leverage).getResult();
        });
        console.log({totalValueOfTheOpenPositions});
        /**
         * - Check the Trader’s Weight
         */
        const traderWeight = trader.weight;
        if (!traderWeight)throw new Error("traderWeight is not available for trader");
    
        /**
         * - calculate the trade allocation based on :
         */
        // - Total Balance - Open Balance = Available Balance
        const availableBalance = new DecimalMath(totalUSDT_balance).subtract(totalValueOfTheOpenPositions).getResult();
        console.log({availableBalance});
        // - Open Balance / Total Balance * 100 = % of Open Balance
        const percentageOfOpenBalance = new DecimalMath(totalValueOfTheOpenPositions).divide(totalUSDT_balance).multiply(100).getResult();
        console.log({percentageOfOpenBalance});
        // - % of Open Balance should never be more than 80%, 
        // if its more than 80 don’t execute the trade ( 20% of reserved balance )
        if(percentageOfOpenBalance>=80){
            throw new Error(`percentage of open balance exceeds 80% threshold: (percentageOfOpenBalance = ${percentageOfOpenBalance})`);
        }
        // - Total Balance = 100%
        // - Max Open Balance = 80%
        // - Traders Total Balance = 50%
    
        /**
         * - calculate trader’s allocated % balance, for example Trader Weight = 0,4 so :
         *   - 0,4 x 50 = 20
         *  - 20 is the trader’s allocated % balance on the Total Balance (100%)
         */
        const traderAllocatedPercentageBalance = new DecimalMath(traderWeight).multiply(0.5).getResult();
        /**
             * - Now calculate the trades allocation %
             */
        // - AVERAGES OF TRADER // NOTE PLEASE CHECK IF THIS IS CORRECT AS WE NEED TO IMPORT traders_base_allocation from TopTraders Collection
        const {trader_base_allocation,average_trade_count_value:traders_average_trade_value} = trader;
        if(!traders_average_trade_value)throw new Error(`Cannot execute the trader's position:traders average_trade_value value is not available: (traders_average_trade_size: ${traders_average_trade_value}) (trader: ${trader.username})`);
    
        const average_trade_value = traders_average_trade_value;
        const base_allocation = trader_base_allocation || 0.1;
    
        /** TRADE VALUE
         *  - Get the trade size + entry price + leverage
         * - Calculate Trade Value = (Size * Entry price) / Leverage
         */
        const tradeValue = new DecimalMath(position.size).multiply(position.entry_price).divide(position.leverage).getResult();
    
        /** TRADE ALLOCATION %
         * - Calculate Trade Allocation % by doing :
         * - Difference = ((Trade Value - Average Trade Value) / Average Trade Value)
         * - If Difference is negative, make it positive
         * - Trade Allocation % = average % allocation per trade * Difference
        */

        //rawDifference is the difference between the trade value and the average trade value
        const rawDifference = new DecimalMath(tradeValue).divide(average_trade_value).getResult();
        
        //trade_allocation_percentage is the trade allocated Balance of the trader
        const trader_allocated_balance = new DecimalMath(traderAllocatedPercentageBalance).multiply(totalUSDT_balance).getResult();

        //base_allocation_value is the base allocation value of the trader
        const base_allocation_value = new DecimalMath(trader_allocated_balance).multiply(base_allocation).getResult();

        //CALCULATE TRADE VALUE 
        //trade_allocation_value is the trade value allocated to this trade
        const trade_allocation_value = new DecimalMath(base_allocation_value).multiply(rawDifference).getResult();
        // const qty = trade_allocation_value;
        // sizeToExecute = qty / entryprice
        const qty = trade_allocation_value / position.entry_price;

        // END
        console.log({
            trader_allocated_balance,
            trade_allocation_value,
            entry_price: position.entry_price,
            // tradeAllocationPercentage,
            average_trade_value,
            tradeValue,
            rawDifference,
            qty
        });
                
        const qtyToByWith = qty;
        // standardize the qty
        const standardizedQTY = await bybit.standardizeQuantity({quantity:qtyToByWith,symbol:position.pair});
        console.log({standardizedQTY});
        // return {standardized_qty:standardizedQTY,trade_allocation_percentage:tradeAllocationPercentage};
        return {standardized_qty:standardizedQTY,traded_value:trade_allocation_value,trader_allocated_balance};

    }catch(error){
        const errMessage = "(fn:percentageBased_DynamicPositionSizingAlgo):"+error.message+" username:"+trader.username;
        throw new Error(errMessage);
    }
}


/**
 * 
 * @param {{
*      bybit: import("../../../../Trader").Bybit,
*      trader: import("../../../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface,
*      position: import("../../../../MongoDatabase/collections/open_trades/types").OpenTrades_Interface,,
*      mongoDatabase: import("../../../../MongoDatabase").MongoDatabase
* }} param0 
*/
async function calculateResizeOrCloseQty({bybit,position,trader,mongoDatabase}) {
    /**
     * Get the running open positions of the pair and direction
     */
    const getPositionInfo_Realtime_Res = await bybit.clients.bybit_RestClientV5.getPositionInfo_Realtime({
        category:"linear",
        symbol: position.pair
    }); 
    if(Object.keys(getPositionInfo_Realtime_Res.result).length===0)throw new Error(getPositionInfo_Realtime_Res.retMsg);

    const postionsWithSameSymbolAndDirection = getPositionInfo_Realtime_Res.result.list.filter((positionV5_)=>
        positionV5_.symbol===position.pair.toUpperCase() &&
        positionV5_.side===(position.direction==="LONG"?"Buy":"Sell")
    );
    
    // TODO: handle when postionsWithSameSymbolAndDirection.lenght ==0;
    const totalQuantityOpened = postionsWithSameSymbolAndDirection.reduce((prevVal,positionV5_)=>prevVal+parseFloat(positionV5_.positionValue),0);

    /**-
     * Get the traded positions from DB
     */
    const tradedPositions_Cursor = await mongoDatabase.collection.tradedPositionsCollection.getAllDocumentsBy({
        status:"OPEN",
        pair:position.pair,
        direction: position.direction
    });
    // TODDO: handle empty tradedPositions
    const tradedPositionsArray = await tradedPositions_Cursor.toArray();
    const tradedPositionObj = tradedPositionsArray.find((tradedPosition_)=>tradedPosition_.trader_uid===trader.uid);
    
    const positionToResizeAllocatedPercentage = tradedPositionObj.allocation_percentage;

  
    const totalAllocatedPercentage =  tradedPositionsArray.reduce((prevVal,tPosition_)=>prevVal+tPosition_.allocation_percentage,0);
 
    const resizePercentage = ((tradedPositionObj.size-position.size)/tradedPositionObj.size)||100; //(oldSize - newSize)/oldSize or 100% if closing .

  
    const newPositionToResizeAllocatedPercentage = positionToResizeAllocatedPercentage * (1 - resizePercentage);
    const allocationPercentageSumWithoutTheCurrentTradedObj = tradedPositionsArray.reduce((prevVal,tPosition_)=>{
        if(tPosition_.trader_uid===trader.uid){
            return prevVal+0;
        }else{
            return prevVal+tPosition_.allocation_percentage;          
        }
    },0);

    const newTotalAllocatedPercentage = allocationPercentageSumWithoutTheCurrentTradedObj + newPositionToResizeAllocatedPercentage;
  
    const allocatedPercentageDifference = totalAllocatedPercentage - newTotalAllocatedPercentage;
    const quantityDifference = totalQuantityOpened * allocatedPercentageDifference;
  
    console.log(`Quantity difference to be closed for position 3: ${quantityDifference}`);

    //now convert it to an actual quantity to close
    //Quantity to close = OriginalTotalPositionSize *%difference
    const quantityToClose = totalQuantityOpened * quantityDifference;

    // standardize the qty
    const standardizedQTY = await bybit.standardizeQuantity({quantity:quantityToClose,symbol:position.pair});
    console.log({standardizedQTY});
    return {standardized_qty:standardizedQTY};
    // return {standardized_qty:standardizedQTY,trade_allocation_percentage:newTotalAllocatedPercentage};
}

module.exports.percentageBased_DynamicPositionSizingAlgo = percentageBased_DynamicPositionSizingAlgo;
module.exports.calculateResizeOrCloseQty = calculateResizeOrCloseQty;



