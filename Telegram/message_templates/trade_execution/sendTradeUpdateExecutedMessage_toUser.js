//@ts-check
"use-strict";

const { DecimalMath } = require("../../../Math");

/**
 * @param {{
 *    bot: import("../..").Telegram,
 *    chatId: number|string,
 *    trader_username: string,
 *    position_pair: string,
 *    position_leverage: number,
 *    position_entry_price: number,
 *    position_direction: string,
 *    change_by: number,
 *    change_percentage: number,
 * }} param0 
 */
module.exports.sendTradeUpdateSizeExecutedMessage_toUser = async function ({
    bot,position_direction,position_entry_price,position_leverage,chatId,trader_username,position_pair,
    change_by,change_percentage
}){
    const FUNCTION_NAME = "(fn:sendTradeUpdateSizeExecutedMessage_toUser)";
    console.log(FUNCTION_NAME);
    try{
        bot.sendMessage(chatId,
            `🟠 Trade Update Executed: Size
${trader_username} ⏐ ${position_pair} ⏐ ${position_direction} ⏐ x${position_leverage}
${new DecimalMath(position_entry_price).truncateToDecimalPlaces(5).getResult()} ⏐ +${change_by} ⏐ +${new DecimalMath(change_percentage).truncateToDecimalPlaces(2).getResult()}%`
        );
    }catch(error){
        error.message = `${FUNCTION_NAME} ${error.message}`;
        throw error;
    }
};
/**
 * @param {{
 *    bot: import("../..").Telegram,
 *    chatId: number,
 *    trader_username: string,
 *    position_pair: string,
 *    position_leverage: number,
 *    position_entry_price: number,
 *    position_direction: string,
 *    change_by: number,
 *    change_percentage: number,
 * }} param0 
 */
module.exports.sendTradeLeverageUpdateExecutedMessage_toUser = async function ({
    bot,position_direction,position_entry_price,position_leverage,chatId,trader_username,position_pair,
    change_by,change_percentage
}){
    const FUNCTION_NAME = "(fn:sendTradeLeverageUpdateExecutedMessage_toUser)";
    console.log(FUNCTION_NAME);
    try{
        await bot.sendMessage(chatId,
            `🟠 Trade Update Executed: Leverage
${trader_username} ⏐ ${position_pair} ⏐ ${position_direction} ⏐ x${position_leverage}
${new DecimalMath(position_entry_price).truncateToDecimalPlaces(2).getResult()} ⏐ +${change_by} ⏐ +${new DecimalMath(change_percentage).truncateToDecimalPlaces(2).getResult()}%`
        );
    }catch(error){
        error.message = `${FUNCTION_NAME} ${error.message}`;
        throw error;
    }
};