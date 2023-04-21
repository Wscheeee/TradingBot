const {UsersCollection} = require("./users");
const {OldTradesCollection} = require("./old_trades");
const {OpenTradesCollection} = require("./open_trades");
const {TopTradersCollection} = require("./top_traders");
const {TradedPositionsCollection} = require("./traded_positions");
const {PerformanceCollection} = require("./performance");
const {UsedAllocationsCollection} = require("./used_allocations");

module.exports =  {
    UsersCollection,
    OldTradesCollection,
    OpenTradesCollection,
    TopTradersCollection,
    TradedPositionsCollection,
    PerformanceCollection,
    UsedAllocationsCollection
};