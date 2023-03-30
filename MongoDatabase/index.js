const {MongoDatabase} = require("./MongoDatabase");
const {PositionsStateDetector} = require("./change_streams/positionStateDetector")

module.exports.MongoDatabase = MongoDatabase;
module.exports.PositionsStateDetector = PositionsStateDetector;