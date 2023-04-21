
/**
 * 
 * @param {{
 *      mongoDatabase:import("../../MongoDatabase").MongoDatabase,
 *      trader: import("../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface,
 *      tradedPosition: import("../../MongoDatabase/collections/traded_positions/types").TradedPosition_Collection_Document_Interface
 * }} param0 
 */
module.exports.calculateUsedAllocation = async function calculateUsedAllocation({mongoDatabase,tradedPosition,trader}){
    // To calculate the Used Allocation:
    // const used_allocation = total_used_balance / trader_allocated_balance_value

    // total_used_balance : find in traded_positions collection, all open positions from this trader and make a sum of their traded_value

    // trader_allocated_balance_value : you already have this value
    /**
         * // total_used_balance : find in traded_positions collection, all open positions from this trader and make a sum of their traded_value
         * @param {string} trader_uid 
         */
    const calculateTotalUsedBalanceForATrader = async (trader_uid)=>{
        const allOpenPositionsForTheTrader_Cursor = await mongoDatabase.collection.tradedPositionsCollection.getAllDocumentsBy({
            trader_uid: trader_uid,
            status:"OPEN"
        });

            
        let sumOfOpenPositonsValue = 0;
        while(await allOpenPositionsForTheTrader_Cursor.hasNext()){
            const position = await allOpenPositionsForTheTrader_Cursor.next();
            sumOfOpenPositonsValue+=position.traded_value;
        }

        return sumOfOpenPositonsValue;
            
    };



    if(!tradedPosition)throw new Error("(tradedPositionsStateDetector.onNewPosition) tradedPosition is null");
    if(!trader)throw new Error("(tradedPositionsStateDetector.onNewPosition) trader is null");

    const tatalUsedBalance = await calculateTotalUsedBalanceForATrader(trader.uid);
    const trader_allocated_balance_value = trader.trader_base_allocation;
    // To calculate the Used Allocation:
    // const used_allocation = total_used_balance / trader_allocated_balance_value
    const used_allocation = tatalUsedBalance/trader_allocated_balance_value;

    return used_allocation;

};