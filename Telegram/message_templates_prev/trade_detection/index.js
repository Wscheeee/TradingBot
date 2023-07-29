const {sendNewTradeDetectedMessage_toUser} = require("./sendNewTradeDetectedMessage_toUser");
const {sendTradeFullClosedDetectedMessage_toUser} = require("./sendTradeFullClosedDetectedMessage_toUser");
const {sendTradePartialClosedDetectedMessage_toUser} = require("./sendTradePartialClosedDetectedMessage_toUser");
const {sendTradeLeverageUpdateDetectedMessage_toUser,sendTradeSizeUpdateDetectedMessage_toUser} = require("./sendTradeUpdateDetectedMessage_toUser");


module.exports = {
    sendNewTradeDetectedMessage_toUser,
    sendTradeFullClosedDetectedMessage_toUser,
    sendTradePartialClosedDetectedMessage_toUser,
    sendTradeLeverageUpdateDetectedMessage_toUser,
    sendTradeSizeUpdateDetectedMessage_toUser
};