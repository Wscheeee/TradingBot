const {UsersCollection} = require("./users");
const {OldTradesCollection} = require("./old_trades");
const {OpenTradesCollection} = require("./open_trades");
const {TopTradersCollection} = require("./top_traders");
const {TradedPositionsCollection} = require("./traded_positions");
const {PerformanceCollection} = require("./performance");
const {SubAccountsCollection} = require("./sub_accounts");
const {SubAccountsConfigCollection} = require("./sub_accounts_config");
const {PreviousOpenTradesBeforeUpdate} = require("./previous_open_trades_before_update");

module.exports =  {
    UsersCollection,
    OldTradesCollection,
    OpenTradesCollection,
    TopTradersCollection,
    TradedPositionsCollection,
    PerformanceCollection,
    SubAccountsCollection,
    SubAccountsConfigCollection,
    PreviousOpenTradesBeforeUpdate
};