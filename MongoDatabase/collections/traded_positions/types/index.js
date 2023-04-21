/**
 * @typedef  {{
 *    order_id: string,
 *    user_id: string,
 *    trader_uid: import("mongodb").ObjectId,
 *    trader_username: string,
 *    position_id_in_oldTradesCollection: import("mongodb").ObjectId,
 *    position_id_in_openTradesCollection: import("mongodb").ObjectId,
 *    direction:"LONG"|"SHORT",
 *    pair: string,
 *    leverage: number,
 *    actual_position_leverage: number,
 *    size: number,
 *    actual_position_size: number,
 *    actual_position_original_size: number,
 *    entry_price: number,
 *    close_price: number,
 *    status: "OPEN"|"CLOSED",
 *    closed_roi_percentage: number,
 *    closed_pnl: number,
 *    traded_value: number,
 *    entry_datetime: Date,
 *    close_datetime: Date,
 *    document_created_at_datetime:Date,
 *    document_last_edited_at_datetime:Date,
 *    server_timezone: string,
 * }} TradedPosition_Document_Interface
 */


/**
 * @typedef { import("mongodb").WithId<TradedPosition_Document_Interface>} TradedPosition_Collection_Document_Interface 
 */



module.exports = {};