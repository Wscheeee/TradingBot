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
 *    closed_roi_percentage: number,
 *    closed_pnl: number,
 *    server_timezone: string,
 *    allocation_percentage: number,
 *    entry_timestamp: number,
 *    close_timestamp: number,
 *    roi_percentage: number,
 *    document_created_at_timestamp: number,
 * }} TradedPositions_Interface
 */


/**
 * @typedef { import("mongodb").WithId<TradedPosition_Interface>} TradedPosition_Collection_Document_Interface 
 */



module.exports = {};