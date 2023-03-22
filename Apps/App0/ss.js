const axios = require("axios");
const qs = require("qs");

const apiKey = "mRd9xWUWPf1TOwCAzL";
const apiSecret = "1GE7ZDfRfKs2EZJvYSvogyhzKtlUyeXPR9bE";

async function executeTrade() {
    try {
        // set headers for authentication
        const headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-API-KEY": apiKey,
            "X-API-SECRET": apiSecret
        };

        // set data for trade
        const data = {
            "symbol": "BTCUSD",
            "side": "Buy",
            "qty": 1,
            "price": 10000,
            "time_in_force": "GoodTillCancel",
            "order_type": "Limit",
            "reduce_only": false
        };

        // stringify the data
        const dataString = qs.stringify(data);

        // make POST request to bybit testnet API
        const response = await axios.post("https://testnet.bybit.com/spot/v1/order", dataString, { headers: headers });

        console.log(response.data);
    } catch (error) {
        console.error(error);
    }
}

executeTrade();
