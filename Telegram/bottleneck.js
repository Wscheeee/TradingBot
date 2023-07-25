//@ts-check
"use strict";

const {Bottleneck} = require("../TaskRunner");


module.exports.bottleneck = new Bottleneck({
    // minTime: 1000 / 30,  // At most 30 requests per second
    maxConcurrent: 1,
    minTime: 3000/1,

});