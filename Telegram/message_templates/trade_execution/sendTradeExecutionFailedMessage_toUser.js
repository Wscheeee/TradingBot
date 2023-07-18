//@ts-check
"use-strict";
/**
 * @param {{
 *    bot: import("../..").Telegram,
 *    chatId: number,
 *    trader_username: string,
 *    position_pair: string,
 *    position_leverage: number,
 *    position_entry_price: number,
 *    position_direction: string,
 *    reason: string
 * }} param0 
 */
module.exports.sendTradeExecutionFailedMessage_toUser = async function ({
    bot,position_direction,position_entry_price,position_leverage,chatId,trader_username,position_pair,
    reason
}){
    const FUNCTION_NAME = "(fn:sendTradeExecutionFailedMessage_toUser)";
    console.log(FUNCTION_NAME);
    try{
        if(reason.toLowerCase().includes("key")===false)return; // filter out some messages
        bot.sendMessage(chatId,
            `⚠️ Trade Execution Failed ‼️

${trader_username}⏐${position_pair}⏐${position_direction}⏐x${position_leverage}
${position_entry_price}
Reason: ${reason}`
        );
    }catch(error){
        error.message = `${FUNCTION_NAME} ${error.message}`;
        throw error;
    }
};