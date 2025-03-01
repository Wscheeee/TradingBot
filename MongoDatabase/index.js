const {MongoDatabase} = require("./MongoDatabase");
const {PositionsStateDetector} = require("./change_streams/positionStateDetector");
// const {TradedPositionsStateDetector} = require("./change_streams/tradedPositionsStateDetector");
const {UsersCollectionStateDetector} = require("./change_streams/usersCollectionStateDetector");
const {SubAccountsConfigCollectionStateDetector} = require("./change_streams/subAccountsConfigCollectionStateDetector");
const {TopTradersCollectionStateDetector} = require("./change_streams/topTradersCollectionStateDetector");

module.exports.MongoDatabase = MongoDatabase;
module.exports.PositionsStateDetector = PositionsStateDetector;
// module.exports.TradedPositionsStateDetector = TradedPositionsStateDetector;
module.exports.UsersCollectionStateDetector = UsersCollectionStateDetector;
module.exports.SubAccountsConfigCollectionStateDetector = SubAccountsConfigCollectionStateDetector;
module.exports.TopTradersCollectionStateDetector = TopTradersCollectionStateDetector;