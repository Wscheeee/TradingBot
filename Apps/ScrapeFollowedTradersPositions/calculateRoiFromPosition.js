/**
 * @param {{
 *      close_price: number,
 *      entry_price: number,
 *      leverage: number,
 * }} param0
 */
module.exports.calculateRoiFromPosition = function calculateRoiFromPosition({
    close_price,entry_price,leverage
}){
    // Calculate the price difference:
    // Closed Price - Entry Price = 2.792 - 2.632727307435 = 0.159272692565
    const priceDiff = close_price - entry_price;
    // Calculate the profit percentage:
    // Profit Percentage = (Price Difference / Entry Price) * 100 = (0.159272692565 / 2.632727307435) * 100 = 6.045628%
    const profitPercentage = (priceDiff / entry_price) * 100;
    // Adjust for leverage:
    // ROI = Profit Percentage * Leverage = 6.045628% * 4 = 24.182512%
    const roi = profitPercentage * leverage;
    // Rounded to two decimal places, the ROI is 24.18%.

    return parseFloat(roi.toFixed(2));

};
