
//@ts-check

const {calculateFromPosition} = require("./calculateFromPosition");

/**
 * @param {{
*      direction: "LONG"|"SHORT",
*      close_price: number,
*      entry_price: number,
*      size: number,
*      leverage: number,
* }} param0
*/
module.exports.calculateRoiFromPosition = function ({
    close_price,direction,entry_price,leverage,size
}){
    const r = calculateFromPosition({
        close_price,direction,entry_price,leverage,size
    });
    return r.roi;
};