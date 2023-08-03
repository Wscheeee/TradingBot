//@ts-check
/**
 * @param {{
*      close_price: number,
*      entry_price: number,
*      leverage: number,
*      direction: "LONG"|"SHORT",
* }} param0
*/
module.exports.calculateRoiFromPosition = function calculateRoiFromPosition({
    close_price, entry_price, leverage, direction
}){

    let priceDiff;
   
    if (direction === "LONG") {
        priceDiff = close_price - entry_price;
    } else if (direction === "SHORT") {
        priceDiff = entry_price - close_price;
    } else {
        throw new Error("Direction should be either 'LONG' or 'SHORT'");
    }

    const profitPercentage = (priceDiff / entry_price) * 100;

    let roi = profitPercentage * leverage;

    return parseFloat(roi.toFixed(2));
};