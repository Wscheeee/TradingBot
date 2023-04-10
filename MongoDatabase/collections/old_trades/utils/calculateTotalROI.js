
/**
 * 
 * @param {import("../types").OldTrades_Collection_Document_Interface[]} trades 
 * @returns {number}
 */
module.exports.calculateTotalROI = function calculateTotalROI(trades) {
    let weightedTotalROI = 0;
    let totalTradeValue = 0;

    for (const trade of trades) {
        const { size, entry_price, leverage } = trade;
        const tradeValue = size * entry_price * leverage;
        totalTradeValue += tradeValue;
    }

    for (const trade of trades) {
        const { size, entry_price, mark_price, leverage } = trade;
        const tradeValue = size * entry_price * leverage;
        const tradeROI = (mark_price - entry_price) / entry_price * 100;
        const weight = tradeValue / totalTradeValue;
        weightedTotalROI += weight * tradeROI;
    }

    return weightedTotalROI;
};