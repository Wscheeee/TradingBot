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
 *    position_value: number,
 *    position_value_percentage_of_sub_capital: number
 * }} param0 
 */
module.exports.sendNewTradeExecutedMessage_toUser = async function ({
    bot,position_direction,position_entry_price,position_leverage,chatId,trader_username,position_pair,
    position_value,position_value_percentage_of_sub_capital
}){
    const FUNCTION_NAME = "(fn:sendNewTradeExecutedMessage_toUser)";
    console.log(FUNCTION_NAME);
    try{
        bot.sendMessage(chatId,
            `🟢 New Trade Executed

${trader_username}⏐${position_pair}⏐${position_direction}⏐x${position_leverage}
${new DecimalMath(position_entry_price).truncateToDecimalPlaces(5).getResult()}⏐ ${new DecimalMath(position_value).truncateToDecimalPlaces(2).getResult()}$ ⏐ ${new DecimalMath(position_value_percentage_of_sub_capital).truncateToDecimalPlaces(2).getResult()}% of Sub Capital`
        );
    }catch(error){
        error.message = `${FUNCTION_NAME} ${error.message}`;
        throw error;
    }
};