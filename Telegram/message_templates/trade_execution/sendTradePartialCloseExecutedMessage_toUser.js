//@ts-check
"use-strict";
/**
 * @param {{
 *    bot: import("../..").Telegram,
 *    chatId: number|string,
 *    trader_username: string,
 *    position_pair: string,
 *    position_leverage: number,
 *    position_entry_price: number,
 *    position_direction: string,
 *    position_roi: number,
 *    position_pnl: number,
 *    change_by:number,
 *    change_by_percentage:number
 * }} param0 
 */
module.exports.sendTradePartialCloseExecutedMessage_toUser = async function ({
    bot,position_direction,position_entry_price,position_leverage,chatId,trader_username,position_pair,
    position_roi,position_pnl,change_by,change_by_percentage
}){
    const FUNCTION_NAME = "(fn:sendTradePartialCloseExecutedMessage_toUser)";
    console.log(FUNCTION_NAME);
    try{
        bot.sendMessage(chatId,
            `🟣 Trade Partial Close Executed
${trader_username}⏐${position_pair}⏐${position_direction}⏐x${position_leverage}
${position_entry_price}⏐ ${change_by} ⏐ ${change_by_percentage}%
ROI: ${position_roi}|${position_pnl}`
        );
    }catch(error){
        error.message = `${FUNCTION_NAME} ${error.message}`;
        throw error;
    }
};