const Bybit = require('./Bybit');
// const publicKey = "IOYyiIfygMc1wwPqYz";
// const privateKey = "YoDlMLPvXbLhNUhj7Hr0byyGdz9tkRXhTAyP";
const apiKey = "1MQIkz3tL1NzOXYk0p";
const secretKey = "FbNIosSstm1Oiv3svOmg2uLtojsitXHuwyEe";

const useTestnet = true;

const bybit = new Bybit(apiKey, secretKey, useTestnet);

async function createNewOrder() {
  try {
    const symbol = 'BTCUSDT';
    const side = 'Buy';
    const quantity = 1;
    const price = 27860;
    const orderType = 'Limit';
    const timeInForce = 'GoodTillCancel';
    const stopPrice = 27500;
    const closePosition = false;
    const reduceOnly = false;

    const order = await bybit.createOrder(symbol, side, quantity, price, orderType, timeInForce, stopPrice, closePosition, reduceOnly);
    console.log(order);
  } catch (error) {
    console.error(error);
  }
}

createNewOrder().then((v)=>{
    console.log({v})
}).catch(error =>{
    console.log({error})
})