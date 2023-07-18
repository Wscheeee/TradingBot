/**
 * part : 0 if original , 1 if resized, 1 ,2 3
 * @typedef {{
 *      trader_id: import("mongodb").ObjectId,
 *      trader_uid: string,
 *      trader_username: string,
 *      trader_today_estimated_balance:number,
 *      part: number,
 *      original_size: number,
 *      total_parts: number
 *      pair: string,
 *      direction: "LONG"|"SHORT",
 *      leverage: number,
 *      size: number,
 *      previous_size_before_partial_close: number,
 *      entry_price: number,
 *      mark_price: number,
 *      open_datetime: Date,
 *      status: "OPEN"|"CLOSED",
 *      followed: boolean,
 *      pnl: number, 
 *      roi: number,
 *      copied: boolean,
 *      document_created_at_datetime:Date,
 *      document_last_edited_at_datetime:Date,
 *      server_timezone:string 
 * }} OpenTrades_Interface 
 */ 

// *      close_datetime: Date,

// *      roi_percentage: number,

/**
 * @typedef {import("mongodb").WithId<OpenTrades_Interface>} OpenTrades_Collection_Document_Interface
 */


module.exports = {};