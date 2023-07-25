//@ts-check
"use strict";

const {Bottleneck} = require("../../TaskRunner");


module.exports.bottleneck = new Bottleneck({
    reservoir: 120, // nombre initial de requêtes disponibles
    reservoirRefreshAmount: 120,
    reservoirRefreshInterval: 1000, // doit être en millisecondes
    // pas de limite pour maxConcurrent ou minTime dans ce cas
});