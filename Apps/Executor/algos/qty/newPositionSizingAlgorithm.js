//@ts-check
const { DecimalMath } = require("../../../../Math");
const {sendTradeExecutionFailedMessage_toUser} = require("../../../../Telegram/message_templates/trade_execution");

/**
 * @description New position sizing algorithm
 * @param {{
 *      user: import("../../../../MongoDatabase/collections/users/types").Users_Collection_Document_Interface,
 *      action: "new_trade"|"resize"|"update"|"trade_close",
 *      bybit: import("../../../../Trader").Bybit,
 *      trader: import("../../../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface,
 *      position: import("../../../../MongoDatabase/collections/open_trades/types").OpenTrades_Interface
 *      mongoDatabase: import("../../../../MongoDatabase").MongoDatabase,
 *      telegram_userMessagingBot: import("../../../../Telegram").Telegram,
 *      totalUSDT_balance?: number,
 *      decimal_allocation: number
 * }} param0
 */
module.exports.newPositionSizingAlgorithm = async function newPositionSizingAlgorithm({
    user,
    action,
    position,
    trader,
    bybit,
    mongoDatabase,
    telegram_userMessagingBot,
    totalUSDT_balance,
    decimal_allocation
}) {
    const FUNCTION_NAME = "(fn:newPositionSizingAlgorithm)";
    try{
        /**
         * @type {number[]} 
         */
        let sizesToExecute;
        /**
         * @type {number} 
         */
        let symbolMaxLot;
        /**
         * @type {number} 
         */
        let symbolStepSize;
    
        switch (action) {
        case "new_trade": {
            const ACTION_NAME = "[Action:(new_trade)]";
            console.log(FUNCTION_NAME+" "+ACTION_NAME);
    
            if(totalUSDT_balance==undefined)throw new Error("totalUSDT_balance param is missing totalUSDT_balance="+totalUSDT_balance);
            if(isNaN(totalUSDT_balance))throw new Error(`totalUSDT_balance param value is isNaN totalUSDT_balance="${JSON.stringify(totalUSDT_balance)}"`);
    
            /**
             *  - (METHOD: Get Single Coin Balance) check the total 
             * USDT balance of the user’s sub account (Total Balance)
             */
            if (position.pair.toLowerCase().includes("usdt") === false) {
                throw new Error("Coin does not include usdt: " + position.pair);
            }
            console.log({totalUSDT_balance});
            /** TRADE VALUE
            * - Get the trade size + entry price + leverage
            * - Calculate Trade Value = (Size * Entry price) / Leverages
            */
            const tradeValue = new DecimalMath(position.size).multiply(position.entry_price).divide(position.leverage).getResult();
    
            /** TRADE ALLOCATION %
                */
            //todo : retrieve trader.daily_roi 
            //todo : retrieve trader.daily_pnl 
            //todo : retrieve trader.past_day_roi 
            //todo : retrieve trader.past_day_pnl 
    
            // - Calculate the trader balance for today + yesterday
            const trader_balance_today = trader.today_estimated_balance;
            if(!trader_balance_today){
                await sendTradeExecutionFailedMessage_toUser({
                    bot:telegram_userMessagingBot,
                    chatId: user.chatId,
                    position_direction: position.direction,
                    position_entry_price: position.entry_price,
                    position_leverage: position.leverage,
                    position_pair: position.pair,
                    trader_username: user.atomos?"Anonymous":trader.username,
                    reason: "Trade Execution Error: "+`trader.today_estimated_balance is ${trader.today_estimated_balance} for trader: ${trader.username}`
                });
                throw new Error(`trader.today_estimated_balance is ${trader.today_estimated_balance} for trader: ${trader.username}`);
            }
            const trader_balance_yesterday = trader.yesterday_estimated_balance;
            if(!trader_balance_yesterday){
                await sendTradeExecutionFailedMessage_toUser({
                    bot:telegram_userMessagingBot,
                    chatId: user.chatId,
                    position_direction: position.direction,
                    position_entry_price: position.entry_price,
                    position_leverage: position.leverage,
                    position_pair: position.pair,
                    trader_username: user.atomos?"Anonymous":trader.username,
                    reason: "Trade Execution Error: "+`trader.yesterday_estimated_balance is ${trader.yesterday_estimated_balance} for trader: ${trader.username}`
                });
                throw new Error(`trader.yesterday_estimated_balance is ${trader.yesterday_estimated_balance} for trader: ${trader.username}`);
            }
            // - Check if balance changed more than 15% from yesterday (this is to prevent from innacurate balance calculations)
            // const diff = Math.abs((trader_balance_today - trader_balance_yesterday).dividedBy(trader_balance_yesterday)) * 100;
            // const diff = Math.abs(new DecimalMath((trader_balance_today - trader_balance_yesterday)).divide(trader_balance_yesterday).getResult()) * 100;
                
            // - Calculate the trader allocated balance for this trade
            // let qty = 0;
            // const ratio = tradeValue / trader_balance_today;
            // qty = totalUSDT_balance * ratio;

            let qty = 0;
            if (decimal_allocation === 0){

                const ratio = tradeValue / trader_balance_today;
                qty = totalUSDT_balance * ratio;

            } else if (decimal_allocation > 0) {

                qty = totalUSDT_balance * decimal_allocation;
            }else{
                throw new Error("decimal_allocation for sub account is neiither 0 nor >0");
            };
            // if (diff > 15) {
            //     qty = trader_balance_today * 0.01;          
            // } else {
            //     const ratio = tradeValue / trader_balance_today;
            //     qty = totalUSDT_balance * ratio;
            // }
    
    
            // END
            console.log({
                positionSize: position.size,
                entry_price: position.entry_price,
                // tradeAllocationPercentage,
                tradeValue,
                // userTrade_Cursor,
                qty
            }); 
    
            // const qtyToByWith = (qty * position.leverage) / position.mark_price
            const qtyToByWith = new DecimalMath(qty).multiply(position.leverage).divide(position.mark_price).getResult();
    
            // standardize the qty
            const standardizedQTY = await bybit.standardizeQuantity({ quantity: qtyToByWith, symbol: position.pair });
            console.log({ standardizedQTY });

            // check that the user accoun balance is able to buy the standardiized qty
            
     
            sizesToExecute = standardizedQTY;
            const symbolInfo = await bybit.clients.bybit_RestClientV5.getSymbolInfo(position.pair);
            if(!symbolInfo)throw new Error("symbolInfo is undefined");
            symbolMaxLot = parseFloat(symbolInfo.lotSizeFilter.maxOrderQty);
            symbolStepSize = parseFloat(symbolInfo.lotSizeFilter.qtyStep);
    
            break;
    
            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        }
        case "resize": {
    
            // Find the trade related to the user
            const userTrade_Doc = await mongoDatabase.collection["tradedPositionsCollection"].findOne({
                status: "OPEN",
                pair: position.pair,
                direction: position.direction,
                trader_uid: position.trader_uid,
                tg_user_id: user.tg_user_id
            });
            if(!userTrade_Doc)throw new Error("(algo:Action:Resize)userTrade_Doc not found");
    
            // Calculate the amount to cut for the user's trade
            const cutPercentage = Math.abs((position.previous_size_before_partial_close - position.size) / position.previous_size_before_partial_close);
            console.log({cutPercentage});
            /**
             * Get the position
             */
            const theTradeInBybit = await bybit.helpers.getActualOpenPositionInBybit({
                bybit,
                category:"linear",
                side:position.direction==="LONG"?"Buy":"Sell",
                symbol: position.pair
            });
            console.log({
                UserPositionQtyRetrievedUsingGetPositionMethod:theTradeInBybit.size
            });
            const valueToCut = parseFloat(theTradeInBybit.size) * cutPercentage;
            console.log({valueToCut});
            const qtyToByWith = valueToCut;
            // standardize the qty
            const standardizedQuantities_array = await bybit.standardizeQuantity({ quantity: qtyToByWith, symbol: position.pair });
            console.log({ standardizedQuantities_array }); 
    
            sizesToExecute = standardizedQuantities_array;
            const symbolInfo = await bybit.clients.bybit_RestClientV5.getSymbolInfo(position.pair);
            if(!symbolInfo)throw new Error("symbolInfo is undefined");
            symbolMaxLot = parseFloat(symbolInfo.lotSizeFilter.maxOrderQty);
            symbolStepSize = parseFloat(symbolInfo.lotSizeFilter.qtyStep);
    
            break;
    
            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
        }
        case "update": {
            // Find the trade related to the user
            const userTrade_Doc = await mongoDatabase.collection["tradedPositionsCollection"].findOne({
                status: "OPEN",
                pair: position.pair,
                direction: position.direction,
                trader_uid: position.trader_uid,
                tg_user_id: user.tg_user_id
            });
            if(!userTrade_Doc)throw new Error("(algo:Action:Update)userTrade_Doc not found");
            console.log("position:",position);
            // Calculate the amount to add for the user's trade
            const cutPercentage = (position.size - position.previous_size_before_partial_close) / position.previous_size_before_partial_close;
            console.log({cutPercentage});
            const valueToAdd = userTrade_Doc.traded_value * cutPercentage;
            console.log({valueToAdd});
            const qty = valueToAdd / position.entry_price;
            const qtyToByWith = qty;
            console.log({qtyToByWith});
            // standardize the qty
            const standardizedQTY = await bybit.standardizeQuantity({ quantity: qtyToByWith, symbol: position.pair });
            console.log({ standardizedQTY });
            sizesToExecute = standardizedQTY;
            const symbolInfo = await bybit.clients.bybit_RestClientV5.getSymbolInfo(position.pair);
            if(!symbolInfo)throw new Error("symbolInfo is undefined");
            symbolMaxLot = parseFloat(symbolInfo.lotSizeFilter.maxOrderQty);
            symbolStepSize = parseFloat(symbolInfo.lotSizeFilter.qtyStep);
    
            break;
    
            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        }
        case "trade_close": {
            console.log("ACTION:trade_close");   
    
    
            /***
             * Get the correct qty of the position on bybit
             */
            const theTradeInBybit = await bybit.helpers.getActualOpenPositionInBybit({
                bybit,
                category:"linear",
                side:position.direction==="LONG"?"Buy":"Sell",
                symbol: position.pair
            });
            const qtyToByWith = Number(theTradeInBybit.size);
            const standardizedQTY = await bybit.standardizeQuantity({ quantity: qtyToByWith, symbol: position.pair });
            console.log({ standardizedQTY });
            sizesToExecute = standardizedQTY;
            const symbolInfo = await bybit.clients.bybit_RestClientV5.getSymbolInfo(position.pair);
            if(!symbolInfo)throw new Error("symbolInfo is undefined");
            symbolMaxLot = parseFloat(symbolInfo.lotSizeFilter.maxOrderQty);
            symbolStepSize = parseFloat(symbolInfo.lotSizeFilter.qtyStep);
            break;
    
            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        }
        default: {
            throw new Error(`Unknown action: ${action}`);
        }
    
        }
    
        return { sizesToExecute , symbolMaxLotSize:symbolMaxLot, symbolLotStepSize:symbolStepSize};

    }catch(error){
        error.message = `${FUNCTION_NAME} ${error.message}`;
        throw error;
    }
};