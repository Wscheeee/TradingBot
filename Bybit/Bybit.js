const crypto = require('crypto');
const https = require('https');

/**
 * Class representing a Bybit API client.
 * @class
 */
class Bybit {
  /**
   * Create a new Bybit API client.
   * @constructor
   * @param {string} apiKey - The API key.
   * @param {string} secretKey - The secret key.
   * @param {boolean} [useTestnet=false] - Whether to use the Bybit Testnet API.
   */
  constructor(apiKey, secretKey, useTestnet = false) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.baseUrl = useTestnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
  }

  /**
   * Send an HTTP request to the Bybit API.
   * @param {string} method - The HTTP method (e.g. 'GET', 'POST').
   * @param {string} path - The API path (e.g. '/v2/private/order/create').
   * @param {Object} [data] - The data to send in the request body.
   * @returns {Promise<Object>} - A Promise that resolves to the API response.
   * @throws {Error} - If the API returns an error or the response is not valid JSON.
   */
  request(method, path, data = {}) {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now().toString();
      const message = method + path + timestamp + JSON.stringify(data);
      const signature = crypto.createHmac('sha256', this.secretKey).update(message).digest('hex');

      const options = {
        hostname: 'api.bybit.com',
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
          'timestamp': timestamp,
          'sign': signature,
        },
      };

      const req = https.request(options, res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 400) {
            reject(new Error(`${res.statusCode} ${res.statusMessage}`));
          } else {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              reject(new Error(`Invalid JSON: ${data}`));
            }
          }
        });
      });

      req.on('error', error => {
        reject(error);
      });

      req.write(JSON.stringify(data));
      req.end();
    });
  }

  /**
   * Create a new order.
   * @param {string} symbol - The symbol to trade (e.g. 'BTCUSD').
   * @param {string} side - The order side ('Buy' or 'Sell').
   * @param {number} quantity - The order quantity.
   * @param {number} price - The order price.
   * @param {string} [orderType='Limit'] - The order type ('Limit', 'Market', 'Stop', 'TakeProfit', or 'StopMarket').
   * @param {string} [timeInForce='GoodTillCancel'] - The time in force ('GoodTillCancel', 'ImmediateOrCancel', or 'FillOrKill').
   * @param {number} [stopPrice] - The stop price (required for Stop and TakeProfit orders).
   * @param {number} [closePosition=false] - Whether to close
   * the position when the order is filled (only for Buy or Sell orders).
   * @param {number} [reduceOnly=false] - Whether to reduce the position when the order is filled (only for Buy or Sell orders).
   * @returns {Promise<Object>} - A Promise that resolves to the order details.
   * @throws {Error} - If the API returns an error or the response is not valid JSON.
   */
  createOrder(symbol, side, quantity, price, orderType = 'Limit', timeInForce = 'GoodTillCancel', stopPrice, closePosition = false, reduceOnly = false) {
    const data = {
      symbol,
      side,
      qty: quantity,
      price,
      order_type: orderType,
      time_in_force: timeInForce,
      reduce_only: reduceOnly,
    };

    if (stopPrice) {
      data.stop_px = stopPrice;
    }

    if (closePosition) {
      data.close_on_trigger = true;
      data.reduce_only = true;
    }

    return this.request('POST', '/v2/private/order/create', data);
  }

  /**
   * Close a position.
   * @param {string} symbol - The symbol to trade (e.g. 'BTCUSD').
   * @param {number} [price] - The price at which to close the position (required for Market orders).
   * @param {string} [orderType='Market'] - The order type ('Market', 'Limit', 'Stop', or 'TakeProfit').
   * @returns {Promise<Object>} - A Promise that resolves to the order details.
   * @throws {Error} - If the API returns an error or the response is not valid JSON.
   */
  closePosition(symbol, price, orderType = 'Market') {
    const data = {
      symbol,
      side: price > 0 ? 'Sell' : 'Buy',
      qty: Math.abs(price),
      order_type: orderType,
      reduce_only: true,
      close_on_trigger: true,
    };

    if (orderType === 'Limit' || orderType === 'Stop') {
      data.price = Math.abs(price);
    }

    if (orderType === 'Stop' || orderType === 'TakeProfit') {
      data.stop_px = Math.abs(price);
    }

    return this.request('POST', '/v2/private/order/create', data);
  }
}

module.exports = Bybit;
