/**
 * @typedef  {{
 *    trader_uid: import("mongodb").ObjectId,
 *    trader_username: string,
 *    position_id_in_oldTradesCollection: import("mongodb").ObjectId,
 *    position_id_in_openTradesCollection: import("mongodb").ObjectId,
 *    direction:"LONG"|"SHORT",
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
 * @typedef { import("mongodb").WithId<TradedPosition_Interface>} TradedPosition_Collection_Document_Interface 
 */



module.exports = {};