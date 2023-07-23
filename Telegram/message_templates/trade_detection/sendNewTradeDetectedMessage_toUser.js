//@ts-check
"use-strict";

const { DecimalMath } = require("../../../Math");

/**
 * @param {{
 *    bot: import("../..").Telegram,
 *    chatId: number,
 *    trader_username: string,
 *    position_pair: string,
 *    position_leverage: number,
 *    position_entry_price: number,
 *    position_direction: string,
 * }} param0 
 */
module.exports.sendNewTradeDetectedMessage_toUser = async function ({
    bot,position_direction,position_entry_price,position_leverage,chatId,trader_username,position_pair
}){
    const FUNCTION_NAME = "(fn:sendNewTradeDetectedMessage)";
    console.log(FUNCTION_NAME);
    try{
        await bot.sendMessage(chatId,
            `🚨 New Trade Detected 🟩
${trader_username} ⏐ ${position_pair} ⏐ ${position_direction} ⏐ x${position_leverage}
${new DecimalMath(position_entry_price).truncateToDecimalPlaces(5).getResult()}`
        );
    }catch(error){
        error.message = `${FUNCTION_NAME} ${error.message}`;
        throw error;
    }
};