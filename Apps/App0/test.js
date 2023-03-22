const crypto = require('crypto');
const fetch = require('node-fetch');

async function executeTrade(pair, size, leverage, side, apiKey, apiTimestamp, apiSignature) {
    try {
        const response = await fetch('https://api-testnet.bybit.com/spot/v1/order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pair,
                side,
                qty: size,
                leverage,
                order_type: 'Market',
                time_in_force: 'GoodTillCancel',
                apiKey,
                apiTimestamp,
                apiSignature
            })
        });

        console.log(await response.json());
    } catch (error) {
        console.error(error);
    }
}
const apiTimestamp = Date.now();
const apiSecret = '1GE7ZDfRfKs2EZJvYSvogyhzKtlUyeXPR9bE';
const apiSignature = crypto.createHmac('sha256', apiSecret).update(`${apiTimestamp}POST/v2/private/order/create`).digest('hex');
//executeTrade(`${newObject.pair}`, `${newObject.size}`);
executeTrade('BTCUSDT', 0.01, 2, 'buy', 'mRd9xWUWPf1TOwCAzL', apiTimestamp, apiSignature);
