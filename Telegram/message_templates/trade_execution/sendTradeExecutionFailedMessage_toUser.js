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
        let reason_msg = reason;
        // if(reason.toLowerCase().includes("key")===false)return; // filter out some messages
        if (reason.toLowerCase().includes("key")){
            reason_msg = "API Key is invalid or missing";
        } else if (reason.toLowerCase().includes("subaccount")){
            reason_msg = "Subaccount doesn't exist / Please Check API Keys";
        } else if (reason.toLowerCase().includes("35")){
            reason_msg = "Trader Capital Used Limit of 35% Reached";
        } else if (reason.toLowerCase().includes("db")){
            reason_msg = "Original Position was not Opened";
        }

        await bot.sendMessage(chatId,
            `⚠️ Trade Execution Failed ‼️
${trader_username} ⏐ ${position_pair} ⏐ ${position_direction} ⏐ x${position_leverage}
${new DecimalMath(position_entry_price).truncateToDecimalPlaces(5).getResult()}
Reason: ${reason_msg}`
        );
    }catch(error){
        error.message = `${FUNCTION_NAME} ${error.message}`;
        throw error;
    }
};