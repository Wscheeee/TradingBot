const {DecimalMath}  = require("../../DecimalMath");
// To calculate the Used Allocation:
// const used_allocation = total_used_balance / trader_allocated_balance_value

// total_used_balance : find in traded_positions collection, all open positions from this trader and make a sum of their traded_value

// trader_allocated_balance_value : you already have this value
/**
 * 
 * @param {{
 *      mongoDatabase:import("../../MongoDatabase").MongoDatabase,
 *      trader: import("../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface,
 *      tradedPosition: import("../../MongoDatabase/collections/traded_positions/types").               
 *      TradedPosition_Collection_Document_Interface,
 *      bybit: import("../../Trader").Bybit,
 * }} param0 
 */
module.exports.calculateUsedAllocationAndSave = async function calculateUsedAllocation({mongoDatabase,tradedPosition,trader,bybit}){
    /**
         * // total_used_balance : find in traded_positions collection, all open positions from all traders and make a sum of their traded_value
         * @param {string} trader_uid 
         */
    const getTheTotalValueOfOpenPositions = async ()=>{
        
        const openPositions_Cursor = await mongoDatabase.collection.tradedPositionsCollection.getAllDocuments({
            status: "OPEN",
            user_id:"5546050788"
        });
        const openPositions = await  openPositions_Cursor.toArray();        
        let totalValueOfTheOpenPositions = 0;
        for (const position of openPositions){
            totalValueOfTheOpenPositions += position.traded_value;
        }

        return totalValueOfTheOpenPositions;
            
    };

    //needs to use user_id:'5546050788' to get api keys and check balance
    const getTotalAccountBalance = async()=>{
        const COIN = "USDT";//position.pair.toLowerCase().replace("usdt","").toUpperCase();
        const accountBalance_Resp = await bybit.clients.bybit_AccountAssetClientV3.getDerivativesCoinBalance({
            accountType: "CONTRACT",
            coin: COIN
        });
        if (!accountBalance_Resp.result || !accountBalance_Resp.result.balance) {
            console.log({ accountBalance_Resp });
            throw new Error(accountBalance_Resp.ret_msg);
        }
        const totalUSDT_balance = parseFloat(accountBalance_Resp.result.balance.walletBalance);
        return totalUSDT_balance;
    };
    if(!tradedPosition)throw new Error("(tradedPositionsStateDetector.onNewPosition) tradedPosition is null");
    if(!trader)throw new Error("(tradedPositionsStateDetector.onNewPosition) trader is null");

    const totalPositionsValue = await getTheTotalValueOfOpenPositions();
    const totalBalance = await getTotalAccountBalance();
    //total_positions_value / total_balance
    const used_balance_percentage_decimal = totalPositionsValue / totalBalance;

    //////////////////////////////////////////////////////////////////
    // return trader_used_allocation
    // calculate trader_allocated_balance_value
    const traderWeight = trader.weight;
    const traderAllocatedPercentageBalance = new DecimalMath(traderWeight).multiply(0.5).getResult();
    const trader_allocated_balance_value_decimal = new DecimalMath(traderAllocatedPercentageBalance).multiply(totalBalance).getResult();

    // calculate trader_used_allocation

    const getTheTotalValueOfTraderPositions = async ()=>{
        
        const openPositions_Cursor = await mongoDatabase.collection.tradedPositionsCollection.getAllDocuments({
            trader_uid:trader.uid,
            status: "OPEN",
            user_id:"5546050788"
        });
        const openPositions = await openPositions_Cursor.toArray();        

        let totalValueOfTheOpenPositions = 0;
        for (const position of openPositions){
            totalValueOfTheOpenPositions += position.traded_value;
        }
        return totalValueOfTheOpenPositions;
            
    };
    const trader_used_allocation = await getTheTotalValueOfTraderPositions();

    const trader_used_allocation_percentage = trader_used_allocation / trader_allocated_balance_value_decimal;

    //////////////////////////////////////////////////////////////////

    const datetime_Now = new Date();

    //save total used balance percentage on the max 80% allocated
    await mongoDatabase.collection.usedAllocationsCollection.createNewDocument({
        document_created_at_datetime: datetime_Now,
        used_balance_percentage_decimal: used_balance_percentage_decimal
    });

    //save trader used allocation percentage on the trader allocation
    await mongoDatabase.collection.usedAllocationsCollection.createNewDocument({
        document_created_at_datetime: datetime_Now,
        trader_uid: trader.uid,
        trader_username: trader.username,
        trader_used_allocation: trader_used_allocation_percentage
    });

};