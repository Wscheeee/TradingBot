//@ts-check
/**
* @typedef {import("../../../../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface} TopTrader_Interface
 * /
/**
 * @typedef {{
 *      success: boolean,
 *      message: string,
 *      data:{
 *          top_traders: import("../../../../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface[]
 *      }
 * }}  GetAllTopTraders_Routes_Payload_Interface
 */

/**
 * @typedef {{
*      success: boolean,
*      message: string,
*      data:{
*          trader_open_positions: import("../../../../../MongoDatabase/collections/open_trades/types").OpenTrades_Collection_Document_Interface[]
*      }
 * }} GetTraderOpenPositions_Routes_Payload_Interface
 */


module.exports = {};