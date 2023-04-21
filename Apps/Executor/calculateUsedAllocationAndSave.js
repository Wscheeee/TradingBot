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
 *      tradedPosition: import("../../MongoDatabase/collections/traded_positions/types").TradedPosition_Collection_Document_Interface,
 *      bybit: import("../../Trader").Bybit,
 *      trader_allocated_balance_value: number
 * }} param0 
 */
module.exports.calculateUsedAllocationAndSave = async function calculateUsedAllocation({mongoDatabase,tradedPosition,trader,bybit,trader_allocated_balance_value}){
    /**
         * // total_used_balance : find in traded_positions collection, all open positions from this trader and make a sum of their traded_value
         * @param {string} trader_uid 
         */
    const getTheTotalValueOfOpenPositions = async ()=>{
        /**
                     * - (METHOD: Get Positions Info) check the total value of 
                     * the open positions at the time it was opened (Open Balance)
                     */
        const openPositions_Resp = await bybit.clients.bybit_RestClientV5.getPositionInfo_Realtime({
            category: "linear",//@todo maybe add more checks
            settleCoin: "USDT"
        });
        if (!openPositions_Resp.result || Object.keys(openPositions_Resp.result).length === 0) {
            console.log({ openPositions_Resp });
            throw new Error(openPositions_Resp.retMsg);
        }
        let totalValueOfTheOpenPositions = 0;
        openPositions_Resp.result.list.forEach((position_) => {
            totalValueOfTheOpenPositions += new DecimalMath(parseFloat(position_.positionValue)).divide(position_.leverage).getResult();
        });
        console.log({ totalValueOfTheOpenPositions });

        return totalValueOfTheOpenPositions;
            
    };

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

    // return used_allocation;
    const datetime_Now = new Date();
    await mongoDatabase.collection.usedAllocationsCollection.createNewDocument({
        document_created_at_datetime: datetime_Now,
        document_last_edited_at_datetime: datetime_Now,
        trader_uid: trader.uid,
        trader_username: trader.username,
        used_balance_percentage_decimal: used_balance_percentage_decimal
    });


};