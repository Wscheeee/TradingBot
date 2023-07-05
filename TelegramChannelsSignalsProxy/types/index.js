//@ts-check

/**
 * @typedef {"LONG"|"SHORT"|"OUT"} SignalDirection_Type
 * @typedef {"MARKET"|"BUY_LIMIT"|"BUY_STOP"|"SELL_LIMIT"|"SELL_STOP"} SignalEntry_Type
 * @typedef {{
 *      direction:SignalDirection_Type,
 *      symbol: string,
 *      SL: number,
 *      TPs:number[],
 *      entry_price: number,
 *      entry_type: SignalEntry_Type
 * }} Signal_Interface
 */




module.exports = {};