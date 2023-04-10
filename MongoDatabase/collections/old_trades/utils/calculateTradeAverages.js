
/**
 * 
 * @param {import("../types").OldTrades_Collection_Document_Interface[]} trades 
 * @param {Date} startDate 
 * @param {Date} endDate 
 */
module.exports.calculateTradeAverages_ByArray = function calculateTradeAverages_ByArray(trades, startDate, endDate) {
    const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
    const daysBetween = (endDate - startDate) / DAY_IN_MILLISECONDS;
  
    if (daysBetween < 1 || trades.length === 0) {
        return { 
            average_concurrent_trades: 0, 
            average_trade_count_value: 0 
        };
    }
  
    let dailyMaxConcurrentTrades = [];
  
    for (let i = startDate; i <= endDate; i = new Date(i.getTime() + DAY_IN_MILLISECONDS)) {
        const dayStart = i;
        const dayEnd = new Date(dayStart.getTime() + DAY_IN_MILLISECONDS);
  
        let maxConcurrentTrades = 0;
  
        for (const tradeA of trades) {
            const { open_date: openDateA, close_date: closeDateA } = tradeA;
  
            if (openDateA >= dayStart && openDateA < dayEnd) {
                let concurrentTrades = 0;
  
                for (const tradeB of trades) {
                    const { open_date: openDateB, close_date: closeDateB } = tradeB;
  
                    if (tradeA !== tradeB && openDateB >= openDateA && openDateB <= closeDateA) {
                        concurrentTrades++;
                    }
                }
  
                maxConcurrentTrades = Math.max(maxConcurrentTrades, concurrentTrades);
            }
        }
  
        dailyMaxConcurrentTrades.push(maxConcurrentTrades);
    }
  
    const averageConcurrentTrades = dailyMaxConcurrentTrades.reduce((sum, value) => sum + value, 0) / daysBetween;
  
    let totalTradesValue = 0;
    let tradeCount = 0;

    for (const trade of trades) {
        // convert trade qty to value
        totalTradesValue += (trade.size * trade.entry_price)/ trade.leverage;
        tradeCount++;
    }
    const averageTradeCountValue = totalTradesValue/tradeCount;
    

    return { 
        average_concurrent_trades:averageConcurrentTrades,
        average_trade_count_value: averageTradeCountValue
    };
};



/**
 * 
 * @param {import("mongodb").FindCursor<import("mongodb").WithId<import("../types").OldTrades_Interface>>} tradesCursor 
 * @param {Date} startDate 
 * @param {Date} endDate 
 */
module.exports.calculateTradeAverages_ByCursor = async function calculateTradeAverages_ByCursor(tradesCursor, startDate, endDate) {
    const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
    const daysBetween = Math.ceil((endDate - startDate) / DAY_IN_MILLISECONDS); // Use Math.ceil to round up for daysBetween

    if (daysBetween < 1 || !tradesCursor) {
        return { 
            average_concurrent_trades: 0, 
            average_trade_count_value: 0 
        };
    }

    let dailyMaxConcurrentTrades = [];

    // Convert tradesCursor to array using tradesCursor.toArray()
    const trades = await tradesCursor.toArray();
    if(trades.length==0){
        return { 
            average_concurrent_trades: 0, 
            average_trade_count_value: 0 
        };
    }
    for (let i = startDate; i <= endDate; i = new Date(i.getTime() + DAY_IN_MILLISECONDS)) {
        const dayStart = i;
        const dayEnd = new Date(dayStart.getTime() + DAY_IN_MILLISECONDS);

        let maxConcurrentTrades = 0;

        for (const tradeA of trades) {
            const { open_date: openDateA, close_date: closeDateA } = tradeA;

            if (openDateA >= dayStart && openDateA < dayEnd) {
                let concurrentTrades = 0;

                for (const tradeB of trades) {
                    const { open_date: openDateB, close_date: closeDateB } = tradeB;

                    if (tradeA !== tradeB && openDateB >= openDateA && openDateB <= closeDateA) {
                        concurrentTrades++;
                    }
                }

                maxConcurrentTrades = Math.max(maxConcurrentTrades, concurrentTrades);
            }
        }

        dailyMaxConcurrentTrades.push(maxConcurrentTrades);
    }

    const averageConcurrentTrades = dailyMaxConcurrentTrades.reduce((sum, value) => sum + value, 0) / daysBetween;

    let totalTradesValue = 0;
    let tradeCount = 0;

    for (const trade of trades) {
        // convert trade qty to value
        totalTradesValue += (trade.size * trade.entry_price)/ trade.leverage;
        tradeCount++;
    }
    const averageTradeCountValue = totalTradesValue/tradeCount;
    

    return { 
        average_concurrent_trades:averageConcurrentTrades,
        average_trade_count_value: averageTradeCountValue
    };
};
