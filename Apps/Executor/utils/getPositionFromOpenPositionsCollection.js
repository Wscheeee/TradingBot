// /**
//  * 
//  * @param {{
// *      mongoDatabase: import("../../../MongoDatabase").MongoDatabase,
// *      logger: import("../../../Logger").Logger,
// *      position: import("../../../MongoDatabase/collections/open_trades/types").OpenTrades_Interface,
// *      trader: import("../../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface
// * }} param0 
// */

// module.exports.getPositionFromOpenPositionsCollection = async function getOpenPositionFromTradedPositionsCollection ({
//     mongoDatabase, position,logger,trader
// }){
//     const tradedPositionsMatchingTheNewPosition_Array = await (await mongoDatabase.collection.tradedPositionsCollection.getAllDocumentsBy({
//         status:"OPEN",
//         actual_position_size: position.size,
//         actual_position_leverage: position.leverage,
//         direction: position.direction,
//         // trader_uid: trader.uid
//     })).toArray()

    

// }