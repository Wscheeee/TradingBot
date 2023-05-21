/**
 * part : 0 if original , 1 if resized, 1 ,2 3
 * @typedef {{
*      original_document_id: import("mongodb").ObjectId,
*      trader_id: import("mongodb").ObjectId,
*      trader_uid: string,
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
*      close_datetime: Date,
*      pnl: number, 
*      roi: number,
*      roi_percentage: number,
*      status: "OPEN"|"CLOSED",
*      followed: boolean,
*      copied: boolean,
*      document_created_at_datetime:Date,
*      document_last_edited_at_datetime:Date,
*      server_timezone:string 
* }} Previous_OpenTrades_Before_Update_Interface 
*/ 

/**
* @typedef {import("mongodb").WithId<OpenTrades_Interface>} Previous_OpenTrades_Before_Update_Collection_Document_Interface
*/


module.exports = {};