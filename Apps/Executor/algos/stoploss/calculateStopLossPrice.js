//@ts-check
/**
 * @param {{
*      entry_price: number,
*      direction: "LONG"|"SHORT",
*      leverage: number,
* }} param0
*/
module.exports.calculateStopLossPrice = function calculateStopLossPrice({
    entry_price,leverage,direction
}){

    let slPrice = 0;

    if (direction === "LONG") {
        slPrice = entry_price - (entry_price * (1 / leverage));

    } else if (direction === "SHORT") {
        slPrice = entry_price + (entry_price * (1 / leverage));
    }

    return (slPrice);
};