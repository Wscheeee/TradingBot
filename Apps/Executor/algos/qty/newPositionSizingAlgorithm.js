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
    let newValue;
    let sizeToExecute;
    let trade;

    switch (action) {
    case "new_trade": {

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
        const totalUSDT_balance = parseFloat(accountBalance_Resp.result.balance.walletBalance);

        /** TRADE VALUE
        * - Get the trade size + entry price + leverage
        * - Calculate Trade Value = (Size * Entry price) / Leverage
        */
        const tradeValue = new DecimalMath(position.size).multiply(position.entry_price).divide(position.leverage).getResult();

        /** TRADE ALLOCATION %
            */
        //todo : retrieve trader.daily_roi 
        //todo : retrieve trader.daily_pnl 
        //todo : retrieve trader.past_day_roi 
        //todo : retrieve trader.past_day_pnl 

        // - Calculate the trader balance for today + yesterday
        const trader_balance_today = new DecimalMath(trader.daily_pnl).divide(trader.daily_roi).add(trader.daily_pnl).getResult();
        const trader_balance_yesterday = new DecimalMath(trader.daily_pnl).divide(trader.daily_roi).add(trader.daily_pnl).getResult();

        // - Check if balance changed more than 15% from yesterday (this is to prevent from innacurate balance calculations)
        // const diff = Math.abs((trader_balance_today - trader_balance_yesterday).dividedBy(trader_balance_yesterday)) * 100;
        const diff = Math.abs(new DecimalMath((trader_balance_today - trader_balance_yesterday)).divide(trader_balance_yesterday)) * 100;
            
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

        const qtyToByWith = qty * position.mark_price;

        // standardize the qty
        const standardizedQTY = await bybit.standardizeQuantity({ quantity: qtyToByWith, symbol: position.pair });
        console.log({ standardizedQTY });

        sizeToExecute = standardizedQTY;

        // Create a new user's trade document with status 'OPEN'
        trade = {
            pair: position.pair,
            direction: position.direction,
            status: "OPEN",
            traded_value: qty,
            leverage: position.leverage,
            trader_uid: trader.uid,
            tg_user_id: user.tg_user_id
        };
        // Create the user's trade and save it in the database
        await mongoDatabase.collection["tradedPositionsCollection"].createNewDocument(trade);

        break;

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    }
    case "resize": {

        // Find the trade related to the user
        const userTrade_Cursor = await mongoDatabase.collection["tradedPositionsCollection"].findOne({
            status: "OPEN",
            pair: position.pair,
            direction: position.direction,
            trader_uid: position.trader_uid,
            tg_user_id: user.tg_user_id
        });

        // Calculate the amount to cut for the user's trade
        const cutPercentage = (position.previous_size_before_partial_close - position.size) / position.previous_size_before_partial_close;
        const valueToCut = userTrade_Cursor.traded_value * cutPercentage;
        const qty = valueToCut / position.entry_price;
        const qtyToByWith = qty;
        // standardize the qty
        const standardizedQTY = await bybit.standardizeQuantity({ quantity: qtyToByWith, symbol: position.pair });
        console.log({ standardizedQTY });
        sizeToExecute = standardizedQTY;

        // Update the user's trade document with new traded_value
        userTrade_Cursor.traded_value = userTrade_Cursor.traded_value - valueToCut;
        await userTrade_Cursor.save();

        break;

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    }
    case "update": {
        // Find the trade related to the user
        const userTrade_Cursor = await mongoDatabase.collection["tradedPositionsCollection"].findOne({
            status: "OPEN",
            pair: position.pair,
            direction: position.direction,
            trader_uid: position.trader_uid,
            tg_user_id: user.tg_user_id
        });

        // Calculate the amount to add for the user's trade
        const cutPercentage = (position.previous_size_before_partial_close - position.size) / position.previous_size_before_partial_close;
        const valueToAdd = userTrade_Cursor.traded_value * cutPercentage;
        newValue = userTrade_Cursor.traded_value + valueToAdd;

        const qty = valueToAdd / position.entry_price;
        const qtyToByWith = qty;
        // standardize the qty
        const standardizedQTY = await bybit.standardizeQuantity({ quantity: qtyToByWith, symbol: position.pair });
        console.log({ standardizedQTY });
        sizeToExecute = standardizedQTY;

        // Update the user's trade document with new traded_value
        userTrade_Cursor.traded_value = newValue;
        await userTrade_Cursor.save();

        break;

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    }
    case "trade_close": {
        console.log("ACTION:trade_close");
        // Find the trade related to the user
        const userTrade = await mongoDatabase.collection["tradedPositionsCollection"].findOne({
            status: "OPEN",
            pair: position.pair,
            direction: position.direction,
            trader_uid: position.trader_uid,
            tg_user_id: user.tg_user_id
        });
        console.log({ userTrade });

        // Calculate the amount to cut for the user's trade
        const qty = userTrade.size;//userTrade_Cursor.traded_value / position.entry_price;
        const qtyToByWith = qty;
        // standardize the qty
        const standardizedQTY = await bybit.standardizeQuantity({ quantity: qtyToByWith, symbol: position.pair });
        console.log({ standardizedQTY });
        sizeToExecute = standardizedQTY;

        // Set the status of the trade to 'CLOSED'
        await mongoDatabase.collection["tradedPositionsCollection"].updateDocument(userTrade._id, {
            status: "CLOSED"
        });
        break;

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    }
    default: {
        throw new Error(`Unknown action: ${action}`);
    }

    }

    return { sizeToExecute };
};