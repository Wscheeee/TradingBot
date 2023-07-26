//@ts-check

/**
 * @param {{
*      roi: number,
*      entry_price: number,
*      size: number,
*      leverage: number,
* }} param0
*/
module.exports.calculatePnlFromPosition = function calculateRoiFromPosition({
    roi,entry_price,leverage,size
}){
    const value = (entry_price * size) / leverage; 
    const pnl = value * roi / 100;

    return parseFloat(pnl.toFixed(2));
};