"use-strict";
//@ts-check


const {Bybit} = require("./Bybit");

module.exports = {
    Bybit
};

// {
//     closeRes: {
//       retCode: 10002,
//       retMsg: 'invalid request, please check your server timestamp or recv_window param. req_timestamp[1680180102752],server_timestamp[1680180108039],recv_window[5000]',
//       result: {},
//       retExtInfo: {},
//       time: 1680180108040
//     }
//   }




  // const allCoinsBalance = await bybit_RestClientV5.getAllCoinsBalance({
        //     accountType:"SPOT"
        // })
        // if(allCoinsBalance.result && allCoinsBalance.result.memberId){
        //     for(const coin of allCoinsBalance.result.balance){
        //         console.log({coin})
        //         if(coin.coin=="USDT"){
        //             console.log("Is USDT : Skipping...")
        //         }else {
        //             const symbol = coin.coin+"USDT";
        //             console.log({symbol})
        //             const symbolInfo = await bybit_LinearClient.getSymbolInfo(symbol);
        //             console.log({symbolInfo})
        //             if(symbolInfo.lot_size_filter.min_trading_qty > coin.walletBalance){
        //                 console.log("Balance too low")
        //             }else {
        //                 const qtyThatCanBeSoldIs = await bybit_LinearClient.formatSellQuantity({
        //                     quantity: coin.walletBalance,
        //                     symbol: symbol
        //                 })
        //                 console.log({qtyThatCanBeSoldIs})
                        
        //                 // sell all to usdt
        //                 const openNewPosition_res = await bybit_RestClientV5openANewPosition({
        //                     category:"spot",
        //                     symbol: symbol,
        //                     orderType:"Market",
        //                     qty: String(qtyThatCanBeSoldIs),
        //                     side:"Sell"
        
        //                 })
        //                 console.log({openNewPosition_res})


        //             }

        //         }
        //     }
        // }
        // // console.log({allCoinsBalance})
        // return;

       /**
        * Get all symbols: Delete the positions with sid:None
        */
    //    const symbolsRes = await bybit_LinearClient.getAllSymbols()
    //     // console.log({symbols})
    //     if(symbolsRes.result && Array.isArray(symbolsRes.result)){
    //         for(const symbolInfo of symbolsRes.result){
    //             const symbolName = symbolInfo.name;
    //             console.log(symbolName)

    //             const positionsRes = await bybit_RestClientV5.getOpenPositions({
    //                 category:"linear",
    //                 symbol:symbolName
    //             })

    //             if(positionsRes.result && Array.isArray(positionsRes.result)){
    //                 for(const position of positionsRes.result){
    //                     console.log({position})
    //                 }
    //             }
    //         }
    //     }
    //     return;