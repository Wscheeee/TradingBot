//@ts-check
"use strict";

const {DecimalMath} = require("./DecimalMath");
module.exports.calculatePercentageChange = (newValue,originalValue)=>{
    // ((newPrice-original) / newPrice )**100
    console.log({newValue,originalValue});
    return new DecimalMath(newValue).subtract(originalValue).divide(originalValue).multiply(100).getResult();
};