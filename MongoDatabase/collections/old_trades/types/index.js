/**
 * part : 0 if original , 1 if resized, 1 ,2 3
 * @typedef {{
 *     original_position_id: import("mongodb").ObjectId,
 *     trader_id: import("mongodb").ObjectId,
*      trader_uid: string,
*      trader_username: string,
*      trader_today_estimated_balance:number,
*      part: number,
*      original_size: number,
*      total_parts: number,
*      pair: string,
*      direction: "LONG"|"SHORT",
*      leverage: number,
*      previous_size_before_partial_close: number,
*      size: number,
*      entry_price: number,
*      mark_price: number,
*      close_price: number,
*      open_datetime: Date,
*      close_datetime: Date,
*      pnl: number,
*      roi: number,
*      roi_percentage: number,
*      status: "OPEN"|"CLOSED",
*      followed: boolean,
*      copied: boolean,
*      document_created_at_datetime:Date,
*      document_last_edited_at_datetime:Date,
*      server_timezone: string,
*      reason:"TRADER_REMOVED_FROM_ATOMOS_SUB_ACCOUNT_CONFIG"|"TRADER_REMOVED_FROM_USER_CUSTOM_SUB_ACCOUNT_CONFIG"|"TRADER_CLOSED_THIS_POSITION",
*      tg_user_id?: number 
* }} OldTrades_Interface 
*/
// tg_user_id?: number for when reason===TRADER_REMOVED_FROM_USER_CUSTOM_SUB_ACCOUNT_CONFIG
/**
* @typedef {import("mongodb").WithId<OldTrades_Interface>} OldTrades_Collection_Document_Interface
*/


module.exports = {};