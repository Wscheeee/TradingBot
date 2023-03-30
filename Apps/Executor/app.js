/**
 * Login to an exchange and place trades;
 */

const { MongoDatabase , PositionsStateDetector} = require("../../MongoDatabase");
const {Bybit_RestClientV5, Bybit_LinearClient} = require("../../Trader");

const { readAndConfigureDotEnv } = require("../../Utils/readAndConfigureDotEnv");


const IS_LIVE = true;
const dotEnvObj = readAndConfigureDotEnv(IS_LIVE);


(async () => {
    let mongoDatabase = null;
    try {
        const bybit_LinearClient = new Bybit_LinearClient({linearClient:Bybit_LinearClient.createLinearClient({
            privateKey: dotEnvObj.BYBIT_PRIVATE_KEY,
            publicKey: dotEnvObj.BYBIT_PUBLIC_KEY,
            testnet: !dotEnvObj.BYBIT_ACCOUNT_IS_LIVE
        })})
        const bybit_RestClientV5 = new Bybit_RestClientV5({restClientV5:Bybit_RestClientV5.createRestClientV5({
            privateKey: dotEnvObj.BYBIT_PRIVATE_KEY,
            publicKey: dotEnvObj.BYBIT_PUBLIC_KEY,
            testnet: !dotEnvObj.BYBIT_ACCOUNT_IS_LIVE
        })})

        mongoDatabase = new MongoDatabase(dotEnvObj.DATABASE_URI);
        await mongoDatabase.connect(dotEnvObj.DATABASE_NAME);
        const positionsStateDetector = new PositionsStateDetector({ mongoDatabase: mongoDatabase });

        positionsStateDetector.onNewPosition(async (position, trader) => {
            console.log("New position added");
            const symbolInfo = await bybit_LinearClient.getSymbolInfo(position.pair);
            const openPositionRes = await bybit_RestClientV5.openNewPosition({
                category:"linear",
                orderType:"Market",
                qty:symbolInfo.lot_size_filter.min_trading_qty,
                side: position.direction,
                symbol: position.pair
            })
            console.log({openPositionRes})
        });

        positionsStateDetector.onUpdatePosition(async (position, trader) => {
            console.log("Position updated");
            // get the open position 
            const openPositionsRes = await bybit_RestClientV5.getOpenPositions({
                category:"inverse",
                symbol:position.pair
            });
            //@todo: handle errors
            if(openPositionsRes.result && openPositionsRes.result.list && openPositionsRes.result.list.length>0){
                const positionInExchange = openPositionsRes.result.list[0] // expecting the position to be one as
                // as the query includes symbol and only one position per symbol is handled
                const updatePositionRes = await bybit_RestClientV5.updateAPosition({
                    category:"linear",
                    orderType:"Market",
                    qty:positionInExchange.size,
                    side: position.direction,
                    symbol: position.pair
                })
                console.log({updatePositionRes})
            
            }
        });

        positionsStateDetector.onPositionClose(async (position, trader) => {
            console.log("Close position");
            // get the open position quantity and close
            const openPositionsRes = await bybit_RestClientV5.getOpenPositions({
                category:"inverse",
                symbol:position.pair
            });
            //@todo: handle errors
            if(openPositionsRes.result && openPositionsRes.result.list && openPositionsRes.result.list.length>0){
                const positionInExchange = openPositionsRes.result.list[0] // expecting the position to be one as
                // as the query includes symbol and only one position per symbol is handled
    
                const closePositionRes = await bybit_RestClientV5.openNewPosition({
                    category:"linear",
                    orderType:"Market",
                    qty:positionInExchange.size,
                    side: position.direction==="LONG"?"Sell":"Buy",
                    symbol: position.pair
                })
                console.log({closePositionRes})

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