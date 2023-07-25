//@ts-check
"use strict";

const {Bottleneck} = require("../TaskRunner");


module.exports.bottleneck = new Bottleneck({
    reservoir: 20, // nombre initial de requêtes disponibles
    reservoirRefreshAmount: 20,
    reservoirRefreshInterval: 60 * 1000, // doit être en millisecondes
    // pas de limite pour maxConcurrent ou minTime dans ce cas
    minTime:3000
});