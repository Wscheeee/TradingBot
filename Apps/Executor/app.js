/**
 * Login to an exchange and place trades;
 */

const { MongoDatabase , PositionsStateDetector} = require("../../MongoDatabase");
const {Bybit_RestClientV5, Bybit_LinearClient} = require("../../Trader");

const { readAndConfigureDotEnv } = require("../../Utils/readAndConfigureDotEnv");


const IS_LIVE = true;
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE);
process.env.TZ = dotEnvObj.TZ;

(async () => {
    /**
     * @type {MongoDatabase|null}
     */
    let mongoDatabase = null;
    try {
        const bybit_LinearClient = new Bybit_LinearClient({
            linearClient:Bybit_LinearClient.createLinearClient({
                privateKey: dotEnvObj.BYBIT_PRIVATE_KEY,
                publicKey: dotEnvObj.BYBIT_PUBLIC_KEY,
                testnet: !dotEnvObj.BYBIT_ACCOUNT_IS_LIVE
            }),
            millisecondsToDelayBetweenRequests: 5000
        })
        const bybit_RestClientV5 = new Bybit_RestClientV5({
            restClientV5:Bybit_RestClientV5.createRestClientV5({
                privateKey: dotEnvObj.BYBIT_PRIVATE_KEY,
                publicKey: dotEnvObj.BYBIT_PUBLIC_KEY,
                testnet: !dotEnvObj.BYBIT_ACCOUNT_IS_LIVE
            }),
            millisecondsToDelayBetweenRequests: 5000
        })

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
        //                 const openNewPosition_res = await bybit_RestClientV5.openNewPosition({
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

        mongoDatabase = new MongoDatabase(dotEnvObj.DATABASE_URI);
        await mongoDatabase.connect(dotEnvObj.DATABASE_NAME);
        const positionsStateDetector = new PositionsStateDetector({ mongoDatabase: mongoDatabase });

        positionsStateDetector.onNewPosition(async (position, trader) => {
            console.log("New position added");
            const symbolInfo = await bybit_LinearClient.getSymbolInfo(position.pair);
            const openPositionRes = await bybit_RestClientV5.openNewPosition({
                category:"linear",
                orderType:"Market",
                qty:String(symbolInfo.lot_size_filter.min_trading_qty),
                side: position.direction==="LONG"?"Buy":"Sell",
                symbol: position.pair
            })
            console.log({openPositionRes})
            if(openPositionRes.result.orderId){
                const getOpenPositions_Res = await bybit_RestClientV5.getOpenPositions({
                    category:"inverse",
                    symbol:position.pair
                });
                console.log({getOpenPositions_Res})
                if(getOpenPositions_Res.result && getOpenPositions_Res.result.list && getOpenPositions_Res.result.list.length>0){
                    const positionInExchange = getOpenPositions_Res.result.list[0] // expecting the position to be one as
                    console.log({positionInExchange})
                  
                    // successfully placedd a position
                    await mongoDatabase.collection.tradedPositionsCollection.createNewDocument({
                        close_price: bybit_LinearClient.getPositionClosePrice(positionInExchange,"Linear"),
                        closedPNL: bybit_LinearClient.calculatePositionPNL(positionInExchange),
                        closedROI: bybit_LinearClient.calculatePositionROI(positionInExchange),
                        entry_price: bybit_LinearClient.getPositionEntryPrice(positionInExchange),
                        leverage: bybit_LinearClient.getPositionLeverage(positionInExchange),
                        pair: position.pair,
                        position_id_in_oldTradesCollection: null,
                        position_id_in_openTradesCollection: position._id,
                        server_timezone: process.env.TZ,
                        size: bybit_LinearClient.getPositionSize(positionInExchange),
                        status: "OPEN",
                        trader_uid: trader.uid,
                        trader_username: trader.username
                    })
                
                }
            }
        });

        positionsStateDetector.onUpdatePosition(async (position, trader) => {
            console.log("Position updated");
            // get the open position 
            const openPositionsRes = await bybit_RestClientV5.getOpenPositions({
                category:"inverse",
                symbol:position.pair
            });
            console.log({openPositionsRes})
            //@todo: handle errors
            if(openPositionsRes.result && openPositionsRes.result.list && openPositionsRes.result.list.length>0){
                for(const positionInExchange of openPositionsRes.result.list){
                    console.log({positionInExchange})
                    // as the query includes symbol and only one position per symbol is handled
                    const updatePositionRes = await bybit_RestClientV5.updateAPosition({
                        category:"linear",
                        orderType:"Market",
                        qty:positionInExchange.size,
                        side: position.direction==="LONG"?"Buy":"Sell",
                        symbol: position.pair
                    })
                    console.log({updatePositionRes})
                }
            
            }
        });

        positionsStateDetector.onPositionClose(async (position, trader) => {
            console.log("Close position");
            // get the open position quantity and close
            const openPositionsRes = await bybit_RestClientV5.getOpenPositions({
                category:"inverse",
                symbol:position.pair
            });
            console.log({openPositionsRes})
            //@todo: handle errors
            if(openPositionsRes.result && openPositionsRes.result.list && openPositionsRes.result.list.length>0){
                for(const positionInExchange of openPositionsRes.result.list){
                    console.log({positionInExchange})
                    if(positionInExchange.side==="Buy"||positionInExchange.side==="Sell"){
                        // Make surre that the position is actually an active position
                        const closePositionRes = await bybit_RestClientV5.openNewPosition({
                            category:"linear",
                            orderType:"Market",
                            qty:positionInExchange.size,
                            side: position.direction==="LONG"?"Sell":"Buy",
                            symbol: position.pair
                        })
                        console.log({closePositionRes})
                    
                    }else {
                        // None Side.
                    }

                }

            }

        });

        positionsStateDetector.listenToOpenTradesCollection();
        positionsStateDetector.listenToOldTradesCollection();
      
    }catch(error){
        if(mongoDatabase){
            await mongoDatabase.disconnect()
        }
        throw error;
    }  
})()