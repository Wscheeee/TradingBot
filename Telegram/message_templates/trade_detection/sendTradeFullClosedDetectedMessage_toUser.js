//@ts-check
"use-strict";

const { DecimalMath } = require("../../../DecimalMath");

/**
 * @param {{
 *    bot: import("../..").Telegram,
 *    chatId: number,
 *    trader_username: string,
 *    position_pair: string,
 *    position_leverage: number,
 *    position_entry_price: number,
 *    position_direction: string,
 *    position_roi: number,
 *    position_pnl: number,
 * }} param0 
 */
module.exports.sendTradeFullClosedDetectedMessage_toUser = async function ({
    bot,position_direction,position_entry_price,position_leverage,chatId,trader_username,position_pair,
    position_roi,position_pnl
}){
    const FUNCTION_NAME = "(fn:sendTradeFullClosedDetectedMessage_toUser)";
    console.log(FUNCTION_NAME);
    try{
        bot.sendMessage(chatId,
            `🚨 Trade Full Close Detected 🟥

${trader_username}⏐${position_pair}⏐${position_direction}⏐x${position_leverage}
${position_entry_price}⏐${new DecimalMath(position_roi).truncateToDecimalPlaces(2).getResult()}% | ${position_pnl}$`
        );
    }catch(error){
        error.message = `${FUNCTION_NAME} ${error.message}`;
        throw error;
    }
};