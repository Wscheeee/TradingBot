/**
 * @typedef {"LONG"|"SHORT"|"OUT"} SignalDirection_Type
 * @typedef {"MARKET"|"BUY_LIMIT"|"BUY_STOP"|"SELL_LIMIT"|"SELL_STOP"} SignalEntry_Type
 * @typedef {{
*      direction: SignalDirection_Type,
*      symbol: string,
*      SL: number,
*      TPs: number[],
*      entry_price: number,
*      entry_type: SignalEntry_Type
* }} Signal_Interface
*/

/**
* Parse the message value and return a Signal_Interface object.
* @param {string} message - The message value to parse.
* @returns {Signal_Interface} The parsed Signal_Interface object.
*/
function parseSignal(message) {
    message = message.toLowerCase(); // Convert the message to lowercase

    const directionRegex = /(je vends|j’achète)/;
    const symbolRegex = /([a-z]{3}[a-z0-9]{3})/;
    const stopLossRegex = /stop loss : (\d+)/;
    const takeProfitRegex = /take profit \d+ : (\d+)/g;
    const entryPriceRegex = /(?:vends|achète) ([a-z]{3}[a-z0-9]{3}) a (\d+)/;
    const entryTypeRegex = /vends|achète/;

    // Remove all words before the direction string
    const directionIndex = message.search(directionRegex);
    if (directionIndex !== -1) {
        message = message.substring(directionIndex);
    }

    const directionMatch = message.match(directionRegex);
    const symbolMatch = message.match(symbolRegex);
    const stopLossMatch = message.match(stopLossRegex);
    const takeProfitMatches = [...message.matchAll(takeProfitRegex)];
    const entryPriceMatch = message.match(entryPriceRegex);
    const entryTypeMatch = message.match(entryTypeRegex);

    if (
        directionMatch &&
   symbolMatch &&
   stopLossMatch &&
   takeProfitMatches.length >= 1 &&
   entryPriceMatch &&
   entryTypeMatch
    ) {
        const direction = directionMatch[0].includes("vends") ? "SHORT" : "LONG";
        const symbol = symbolMatch[1].toUpperCase();
        const stopLoss = Number(stopLossMatch[1]);
        const takeProfits = takeProfitMatches.map((match) => Number(match[1]));
        const entryPrice = Number(entryPriceMatch[2]);
        const entryType = entryTypeMatch[0].includes("vends") ? "MARKET" : "MARKET";

        return {
            direction,
            symbol,
            SL: stopLoss,
            TPs: takeProfits,
            entry_price: entryPrice,
            entry_type: entryType,
        };
    } else {
        // Return a default Signal_Interface object or handle error as needed
        return {
            direction: "OUT",
            symbol: "",
            SL: 0,
            TPs: [],
            entry_price: 0,
            entry_type: "MARKET",
        };
    }
}

// Example usage
const message =
 "🚨ALERTE CRYPTOS 🚨\n" +
 "\n" +
 "Je vends BTCUSD a 30100\n" +
 "\n" +
 "❌ Stop Loss : 31150\n" +
 "\n" +
 "💰Take Profit 1 : 29600\n" +
 "\n" +
 "💰Take Profit 2 : 29000\n" +
 "\n" +
 "💰Take Profit 3 : 26700\n" +
 "\n" +
 "\n" +
 "➡️Vidéo sur la gestion des risques : https://t.me/c/1240221457/2725\n" +
 "\n" +
 "➡️Tableau des lots que je préconise : https://t.me/c/1240221457/2816";

const signal = parseSignal(message);
console.log(signal);
