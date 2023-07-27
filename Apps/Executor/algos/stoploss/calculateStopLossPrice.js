//@ts-check
const { DecimalMath} = require("../../../../Math");
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
    const FUNCTON_NAME = "(fn):calculateStopLossPrice)";
    console.log(FUNCTON_NAME);

    let slPrice = 0;

    if (direction === "LONG") {
        // slPrice = entry_price - (entry_price * (1 / leverage));
        slPrice = new DecimalMath(entry_price).subtract((new DecimalMath(entry_price).multiply(new DecimalMath(1).divide(leverage).getResult()).getResult())).getResult();
        
    } else if (direction === "SHORT") {
        // slPrice = entry_price + (entry_price * (1 / leverage));
        slPrice = new DecimalMath(entry_price).add((new DecimalMath(entry_price).multiply(new DecimalMath(1).divide(leverage).getResult()).getResult())).getResult();
    }
    // Standardize the decimalplaces
    const numberOfDecimalPlacesInPrice = new DecimalMath(entry_price).countDecimalPlaces().getResult();
    const slPrice_standardized = new DecimalMath(slPrice).truncateToDecimalPlaces(numberOfDecimalPlacesInPrice).getResult();
    console.log({
        entry_price,
        leverage,
        direction,
        numberOfDecimalPlacesInPrice,
        slPrice,
        slPrice_standardized
    });
    return slPrice_standardized;
};