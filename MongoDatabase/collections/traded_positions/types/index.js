const {ObjectId,WithId} = require("mongodb")

/**
 * @typedef  {{
 *    trader_uid: ObjectId,
 *    trader_username: string,
 *    position_id_in_oldTradesCollection: ObjectId,
 *    position_id_in_openTradesCollection: ObjectId,
 *    pair: string,
 *    leverage: number
 *    size: number,
 *    entry_price: number,
 *    close_price: number,
 *    status: "OPEN"|"CLOSED",
 *    closedROI: number,
 *    closedPNL: number,
 *    server_timezone: string,
 * }} TradedPositions_Interface
 */


/**
 * @typedef { WithId<TradedPosition_Interface>} TradedPosition_Collection_Document_Interface 
 */



module.exports = {}