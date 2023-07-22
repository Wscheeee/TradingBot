const {DecimalMath} = require("./DecimalMath");

class FinanceMath {
    constructor(){};
    /** 
     * @param {{entry_price:number,leverage:number,previous_size:number,new_size:number,mark_price:number}} params 
     */
    static calculatePNL({ entry_price,leverage,mark_price,new_size,previous_size }){
         return new DecimalMath(savedPosition_.pnl).subtract(position_.pnl).getResult()
    }

    /** 
     * @param {{entry_price:number,leverage:number,previous_size:number,new_size:number,mark_price:number}} params 
     */
    static calculateROI({entry_price,leverage,mark_price,new_size,previous_size}){

    }
    /**
     * 
     * @param {number} previous_size 
     * @param {number} new_size
     */
    static calculateTheClosedPartialSize(previous_size,new_size){
        return new DecimalMath(previous_size).subtract(new_size).getResult()
    }
}

module.exports.FinanceMath = FinanceMath;