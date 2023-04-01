const {MembershipUsersCollection} = require("./membership_users");
const {OldTradesCollection} = require("./old_trades");
const {OpenTradesCollection} = require("./open_trades");
const {TopTradersCollection} = require("./top_traders");
const {TradedPositionsCollection} = require('./traded_positions')


module.exports =  {
    MembershipUsersCollection,
    OldTradesCollection,
    OpenTradesCollection,
    TopTradersCollection,
    TradedPositionsCollection
}