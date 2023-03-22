const {ObjectId} = require("mongodb")

/**
 * part : 0 if original , 1 if resized, 1 ,2 3
 * @typedef {{
 *     original_position_id: ObjectId,
 *     trader_id: ObjectId,
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
*      open_date: number,
*      close_date: number,
*      pnl: number,
*      roi: number,
*      status: "OPEN"|"CLOSED",
*      followed: boolean
* }} OldTrades_Interface 
*/

/**
* @typedef {_id:ObjectId,...OldTrades_Interface} OldTrades_Collection_Document_Interface
*/


module.exports = {}