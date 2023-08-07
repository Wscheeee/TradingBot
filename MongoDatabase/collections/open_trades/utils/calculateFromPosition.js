//@ts-check

/**
 * @param {{
*      entry_price: number,
*      close_price: number,
*      size: number,
*      direction: string,
*      leverage: number,
* }} param0
*/

module.exports.calculateFromPosition = function calculateFromPosition({
    leverage,entry_price,close_price,size,direction
}){
    let pnl;

    if (direction === "LONG") {
        pnl = (close_price - entry_price) * size;
    } else if (direction === "SHORT") {
        pnl = (entry_price - close_price) * size;    
    } else {
        throw new Error("Direction should be either 'LONG' or 'SHORT'");
    }

    let value = (entry_price * size) / leverage;

    const roi = (pnl / value) * 100;
    
    return {
        pnl: parseFloat(pnl.toFixed(2)),
        roi: parseFloat(roi.toFixed(2))
    };
};