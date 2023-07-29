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
 *    position_roi: number,
 *    position_pnl: number,
 *    change_by:number,
 *    change_by_percentage:number
 * }} param0 
 */
module.exports.sendTradePartialClosedDetectedMessage_toUser = async function ({
    bot,position_direction,position_entry_price,position_leverage,chatId,trader_username,position_pair,
    position_roi,position_pnl,change_by,change_by_percentage
}){
    const FUNCTION_NAME = "(fn:sendTradePartialClosedDetectedMessage_toUser)";
    console.log(FUNCTION_NAME);
    try{
        await bot.sendMessage(chatId,
            `🚨 Trade Partial Close Detected 🟪
${trader_username} ⏐ ${position_pair} ⏐ ${position_direction} ⏐ x${position_leverage}
${new DecimalMath(position_entry_price).truncateToDecimalPlaces(5).getResult()} ⏐ ${change_by} ⏐ ${new DecimalMath(change_by_percentage).truncateToDecimalPlaces(2).getResult()}%
ROI ${new DecimalMath(position_roi).truncateToDecimalPlaces(2).getResult()}% | ${new DecimalMath(position_pnl).truncateToDecimalPlaces(2).getResult()}$`
        );
    }catch(error){
        error.message = `${FUNCTION_NAME} ${error.message}`;
        throw error;
    }
};