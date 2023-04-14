/**
 * part : 0 if original , 1 if resized, 1 ,2 3
 * @typedef {{
 *      trader_id: import("mongodb").ObjectId,
 *      trader_uid: string,
 *      part: number,
 *      original_size: number,
 *      total_parts: number
 *      pair: string,
 *      direction: "LONG"|"SHORT",
 *      leverage: number,
 *      size: number,
 *      entry_price: number,
 *      mark_price: number,
 *      open_datetime: Date,
 *      close_datetime: Date,
 *      pnl: number, 
 *      roi: number,
 *      status: "OPEN"|"CLOSED",
 *      followed: boolean,
 *      copied: boolean,
 *      document_created_at_datetime:Date,
 *      document_last_edited_at_datetime:Date,
 *      server_timezone:string 
 * }} OpenTrades_Interface 
 */ 

/**
 * @typedef {import("mongodb").WithId<OpenTrades_Interface>} OpenTrades_Collection_Document_Interface
 */


module.exports = {};