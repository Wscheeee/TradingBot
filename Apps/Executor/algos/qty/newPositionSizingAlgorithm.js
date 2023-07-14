//@ts-check
const { DecimalMath } = require("../../../../DecimalMath");

/**
 * @description New position sizing algorithm
 * @param {{
 *      user: import("../../../../MongoDatabase/collections/users/types").Users_Collection_Document_Interface,
 *      action: "new_trade"|"resize"|"update"|"trade_close",
 *      bybit: import("../../../../Trader").Bybit,
 *      trader: import("../../../../MongoDatabase/collections/top_traders/types").TopTraderCollection_Document_Interface,
 *      position: import("../../../../MongoDatabase/collections/open_trades/types").OpenTrades_Interface
 *      mongoDatabase: import("../../../../MongoDatabase").MongoDatabase
 * }} param0
 */
module.exports.newPositionSizingAlgorithm = async function newPositionSizingAlgorithm({
    user,
    action,
    position,
    trader,
    bybit,
    mongoDatabase,
}) {
    const FUNCTION_NAME = "(fn:newPositionSizingAlgorithm)";
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

        /**
         *  - (METHOD: Get Single Coin Balance) check the total 
         * USDT balance of the user’s sub account (Total Balance)
         */
        if (position.pair.toLowerCase().includes("usdt") === false) {
            throw new Error("Coin does not include usdt: " + position.pair);
        }
        const COIN = "USDT";//position.pair.toLowerCase().replace("usdt","").toUpperCase();
        const accountBalance_Resp = await bybit.clients.bybit_AccountAssetClientV3.getDerivativesCoinBalance({
            accountType: "CONTRACT",
            coin: COIN
        }); 
        if (!accountBalance_Resp.result || !accountBalance_Resp.result.balance) {
            console.log({ accountBalance_Resp });
            throw new Error(accountBalance_Resp.ret_msg);
        }
        const openPositionsTotalUSDTValue = await bybit.clients.bybit_RestClientV5.getTotalOpenPositionsUSDTValue({
            category:"linear",
            settleCoin:"USDT"
        });
        console.log({openPositionsTotalUSDTValue});
        const totalUSDT_balance = new DecimalMath(parseFloat(accountBalance_Resp.result.balance.walletBalance)).add(openPositionsTotalUSDTValue).getResult();
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
        if(!trader_balance_today)throw new Error(`trader.today_estimated_balance is ${trader.today_estimated_balance} for trader: ${trader.username}`);
        const trader_balance_yesterday = trader.yesterday_estimated_balance;
        if(!trader_balance_yesterday)throw new Error(`trader.yesterday_estimated_balance is ${trader.yesterday_estimated_balance} for trader: ${trader.username}`);
        // - Check if balance changed more than 15% from yesterday (this is to prevent from innacurate balance calculations)
        // const diff = Math.abs((trader_balance_today - trader_balance_yesterday).dividedBy(trader_balance_yesterday)) * 100;
        const diff = Math.abs(new DecimalMath((trader_balance_today - trader_balance_yesterday)).divide(trader_balance_yesterday).getResult()) * 100;
            
        // - Calculate the trader allocated balance for this trade
        let qty = 0;

        if (diff > 15) {
            qty = trader_balance_today * 0.01;          
        } else {
            const ratio = tradeValue / trader_balance_today;
            qty = totalUSDT_balance * ratio;
        }


        // END
        console.log({
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

        sizesToExecute = standardizedQTY;
        const symbolInfo = await bybit.clients.bybit_LinearClient.getSymbolInfo(position.pair);
        if(!symbolInfo)throw new Error("symbolInfo is undefined");
        symbolMaxLot = symbolInfo.lot_size_filter.max_trading_qty;
        symbolStepSize = symbolInfo.lot_size_filter.qty_step;

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
        const valueToCut = userTrade_Doc.traded_value * cutPercentage;
        const qty = valueToCut / position.entry_price;
        const qtyToByWith = qty;
        // standardize the qty
        const standardizedQuantities_array = await bybit.standardizeQuantity({ quantity: qtyToByWith, symbol: position.pair });
        console.log({ standardizedQuantities_array }); 

        sizesToExecute = standardizedQuantities_array;
        const symbolInfo = await bybit.clients.bybit_LinearClient.getSymbolInfo(position.pair);
        if(!symbolInfo)throw new Error("symbolInfo is undefined");
        symbolMaxLot = symbolInfo.lot_size_filter.max_trading_qty;
        symbolStepSize = symbolInfo.lot_size_filter.qty_step;

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
        const symbolInfo = await bybit.clients.bybit_LinearClient.getSymbolInfo(position.pair);
        if(!symbolInfo)throw new Error("symbolInfo is undefined");
        symbolMaxLot = symbolInfo.lot_size_filter.max_trading_qty;
        symbolStepSize = symbolInfo.lot_size_filter.qty_step;

        break;

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    }
    case "trade_close": {
        console.log("ACTION:trade_close");
        // Find the trade related to the user
        // const userTrade_Doc = await mongoDatabase.collection["tradedPositionsCollection"].findOne({
        //     status: "OPEN",
        //     pair: position.pair,
        //     direction: position.direction,
        //     trader_uid: position.trader_uid,
        //     tg_user_id: user.tg_user_id
        // });
        // console.log({ userTrade_Doc });
        // if(!userTrade_Doc)throw new Error("(algo:Action:Close)userTrade_Doc not found");

        // // Calculate the amount to cut for the user's trade
        // const qty = userTrade_Doc.size;//userTrade_Cursor.traded_value / position.entry_price;
        // const qtyToByWith = qty;
        // // standardize the qty
        // const standardizedQTY = await bybit.standardizeQuantity({ quantity: qtyToByWith, symbol: position.pair });
        // console.log({ standardizedQTY });
        // sizesToExecute = standardizedQTY;



        /***
         * Get the correct qty of the position on bybit
         */
        
        const getOpenPosition_Result =  await bybit.clients.bybit_RestClientV5.getPositionInfo_Realtime({
            category:"linear",
            // settleCoin:"USDT"
            symbol: position.pair,
            
        });

        if(getOpenPosition_Result.retCode!==0)throw new Error(`getActiveOrders_Result: ${getOpenPosition_Result.retMsg}`);
        // console.log({getOpenPosiion_Result});
        const theTradeInBybit = getOpenPosition_Result.result.list.find((p)=>{
            console.log({
                p
            });
            if(
                p.side===(position.direction==="LONG"?"Buy":"Sell")
                &&
                p.symbol===position.pair
            ){
                return p;
            }
        });
        if(!theTradeInBybit)throw new Error(`not found theTradeInBybit : ${theTradeInBybit}`);
        const qtyToByWith = Number(theTradeInBybit.size);
        const standardizedQTY = await bybit.standardizeQuantity({ quantity: qtyToByWith, symbol: position.pair });
        console.log({ standardizedQTY });
        sizesToExecute = standardizedQTY;
        const symbolInfo = await bybit.clients.bybit_LinearClient.getSymbolInfo(position.pair);
        if(!symbolInfo)throw new Error("symbolInfo is undefined");
        symbolMaxLot = symbolInfo.lot_size_filter.max_trading_qty;
        symbolStepSize = symbolInfo.lot_size_filter.qty_step;
        break;

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    }
    default: {
        throw new Error(`Unknown action: ${action}`);
    }

    }

    return { sizesToExecute , symbolMaxLotSize:symbolMaxLot, symbolLotStepSize:symbolStepSize};
};