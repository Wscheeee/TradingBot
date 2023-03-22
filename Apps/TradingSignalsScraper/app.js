const {BinanceScraper,createPuppeteerBrowser} = require("../../Binance_Scraper");
const {MongoDatabase} = require("../../MongoDatabase");

process.env.DB_USERNAME = "georgemburu056";
process.env.DB_PASSWORD = "DzTnbYfVeC8x6M6n";
process.env.DATABASE_URI = `mongodb+srv://georgemburu056:${process.env.DB_PASSWORD}@cluster0.xrwllry.mongodb.net/?retryWrites=true&w=majority`
process.env.DATABASE_NAME = "BinanceSignals";


/**
 * 
 * @param {number} ms 
 */
function sleepAsync(ms){
    return new Promise((resolve,reject)=>{
        const timeout = setTimeout(()=>{
            clearTimeout(timeout);
            resolve(true)
        },ms)
    })
}


(async ()=>{
    const browser = await createPuppeteerBrowser({
        IS_LIVE: false,
        browserRevisionToDownload:"901912",
        devtools: true,
        headless:true,
        downloadBrowserRevision: false
    })
    console.log("Running binanceScraper app")
    const binanceScraper = new BinanceScraper({isLive:false,browser:browser})
    const page = await binanceScraper.createNewPage();
while(true){
    try{
        const mongoDatabase = new MongoDatabase(process.env.DATABASE_URI);
        console.log("a")
        await mongoDatabase.connect(process.env.DATABASE_NAME);
        // await mongoDatabase.connect("BinanceSignals");

        await binanceScraper.openLeaderboardFuturesPage(page)
        const leaderBoardUsers = await binanceScraper.getLeaderboardRankUsers(page,{
            isShared:true,
            isTrader:false,
            periodType: "WEEKLY",
            statisticsType: "ROI",
            tradeType: "PERPETUAL"
        });
        // console.log("leaderBoardUsers\=============",leaderBoardUsers)

        /**
         * save the users to DB if not saved
         */
        for(const trader of leaderBoardUsers){
            /**
             * ccheck if trader is already saved in the Db: If not save otherwise update
             */
            let savedTrader = await mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(trader.encryptedUid);
            console.log({savedTrader})

            // Get more info on trader
            const traderOtherLeaderboardBaseInfo = await binanceScraper.getOtherLeaderboardBaseInfo(page,{encryptedUid:trader.encryptedUid});
            // console.log("traderOtherLeaderboardBaseInfo\=============",traderOtherLeaderboardBaseInfo)
            const traderPerformace = await binanceScraper.getOtherPerformance(page,{encryptedUid:trader.encryptedUid,tradeType:'PERPETUAL'});
            // console.log("traderPerformace\=============",traderPerformace)
            const traderPerformanceIsAvailable = traderPerformace && traderPerformace.performanceRetList && traderPerformace.performanceRetList.length>0
            console.log({uid:trader.encryptedUid,})
            console.log({traderPerformace:traderPerformace})
            if(savedTrader){
                // update trader document
                await mongoDatabase.collection.topTradersCollection.updateDocument(savedTrader._id,{
                    username: trader.nickName,
                    uid: trader.encryptedUid,
                    copied: false,
                    allPNL: trader.pnl,
                    allROI: trader.roi,
                    dailyPNL: traderPerformanceIsAvailable===false?0:traderPerformace.performanceRetList.filter((performance)=> {
                        if(performance.periodType==="DAILY" && performance.statisticsType==="PNL"){
                            return performance
                        }
                    })[0].value ,
                    dailyROI: traderPerformanceIsAvailable===false?0:traderPerformace.performanceRetList.filter((performance)=> {
                        if(performance.periodType==="DAILY" && performance.statisticsType==="ROI"){
                            return performance
                        }
                    })[0].value,
                    monthlyPNL:traderPerformanceIsAvailable===false?0:traderPerformace.performanceRetList.filter((performance)=> {
                        if(performance.periodType==="MONTHLY" && performance.statisticsType==="PNL"){
                            return performance
                        }
                    })[0].value,
                    monthlyROI:traderPerformanceIsAvailable===false?0:traderPerformace.performanceRetList.filter((performance)=> {
                        if(performance.periodType==="MONTHLY" && performance.statisticsType==="ROI"){
                            return performance
                        }
                    })[0].value,
                    weeklyPNL:traderPerformanceIsAvailable===false?0:traderPerformace.performanceRetList.filter((performance)=> {
                        if(performance.periodType==="WEEKLY" && performance.statisticsType==="PNL"){
                            return performance
                        }
                    })[0].value,
                    weeklyROI:traderPerformanceIsAvailable===false?0:traderPerformace.performanceRetList.filter((performance)=> {
                        if(performance.periodType==="WEEKLY" && performance.statisticsType==="ROI"){
                            return performance
                        }
                    })[0].value,
                    url:""
    
                })
            }else {
                // save the trader
                await mongoDatabase.collection.topTradersCollection.createNewDocument({
                    username: trader.nickName,
                    uid: trader.encryptedUid,
                    copied: false,
                    allPNL: trader.pnl,
                    allROI: trader.roi,
                    dailyPNL: traderPerformanceIsAvailable===false?0:traderPerformace.performanceRetList.filter((performance)=> {
                        if(performance.periodType==="DAILY" && performance.statisticsType==="PNL"){
                            return performance
                        }
                    })[0].value,
                    dailyROI: traderPerformanceIsAvailable===false?0:traderPerformace.performanceRetList.filter((performance)=> {
                        if(performance.periodType==="DAILY" && performance.statisticsType==="ROI"){
                            return performance
                        }
                    })[0].value,
                    monthlyPNL:traderPerformanceIsAvailable===false?0:traderPerformace.performanceRetList.filter((performance)=> {
                        if(performance.periodType==="MONTHLY" && performance.statisticsType==="PNL"){
                            return performance
                        }
                    })[0].value,
                    monthlyROI:traderPerformanceIsAvailable===false?0:traderPerformace.performanceRetList.filter((performance)=> {
                        if(performance.periodType==="MONTHLY" && performance.statisticsType==="ROI"){
                            return performance
                        }
                    })[0].value,
                    weeklyPNL:traderPerformanceIsAvailable===false?0:traderPerformace.performanceRetList.filter((performance)=> {
                        if(performance.periodType==="WEEKLY" && performance.statisticsType==="PNL"){
                            return performance
                        }
                    })[0].value,
                    weeklyROI:traderPerformanceIsAvailable===false?0:traderPerformace.performanceRetList.filter((performance)=> {
                        if(performance.periodType==="WEEKLY" && performance.statisticsType==="ROI"){
                            return performance
                        }
                    })[0].value,
                    url:""
    
                })
                
            };
            savedTrader = await mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(trader.encryptedUid);

            // console.log({savedTrader})
            // return;

 
            // SAVE POSITIONS/TRADES
            const traderPositions = await binanceScraper.getOtherPosition(page,{encryptedUid:trader.encryptedUid, tradeType:"PERPETUAL"})
            // console.log("userPositions\=============",userPositions)
            const traderSavedOpenPositionsCursor = await mongoDatabase.collection.openTradesCollection.getDocumentsByTraderUid(trader.encryptedUid);
            const traderSavedOpenPositions = await traderSavedOpenPositionsCursor.toArray();
            // console.log({traderSavedOpenPositions})
            // return;
            const traderHasOpenPositionsSaved = traderSavedOpenPositions && traderSavedOpenPositions.length>0;
            const traderHasOpenPositions = traderPositions &&  traderPositions.length>0;
            if(traderHasOpenPositionsSaved===true){
                // check if the the traderSavedOpenPositions are same as the currently scrapped ones if not handle
                //1. Check if length of new scrapped positions length is less that that of the saved positions, means some psoitions was closed
                if(traderHasOpenPositions===false){
                    // all positions closed
                    for(const savedPosition_ in  traderSavedOpenPositions){
                        const oldTradeToSave = {...savedPosition_};
                        delete oldTradeToSave._id;
                        // move the save positions to the old trades collection
                        await mongoDatabase.collection.oldTradesCollection.createNewDocument({
                            ...oldTradeToSave,
                            close_date:binanceScraper.utils.closeNow().close_timestamp,
                            status: "CLOSED"
                        })
                        // delete the positiion from open positions
                        await mongoDatabase.collection.openTradesCollection.deleteManyDocumentsByIds([savedPosition_._id])

                    }
                    
                }else {
                    const traderOpenPositions = traderPositions;//traderPositions.otherPositionRetList.map((p)=> p)
                    
                    // trader still has some open positions
                    if(traderPositions.length < traderSavedOpenPositions.length){
                        // some positions were closed;
                        /**
                         * @type {import("../../MongoDatabase/collections/open_trades/types").OpenTrades_Collection_Document_Interface[]}
                         */
                        const closedPositions = [];
                        traderSavedOpenPositions.forEach((savedPosition)=> {
                            let foundOpenPositionInSavedPositions = false;
                            traderOpenPositions.forEach((openPosition_)=>{
                                const openPositionDirection = openPosition_.amount>0?"LONG":"SHORT";
                                if(
                                    // openPosition.symbol === savedPosition.pair &&
                                    // openPosition.entryPrice === savedPosition.entry_price
                                    openPosition_.symbol === savedPosition_.pair &&
                                    openPosition_.leverage === savedPosition_.leverage &&
                                    openPositionDirection === savedPosition_.direction
                                    //savedPosition_.part===0

                                    ){
                                        foundOpenPositionInSavedPositions = true;
                                    }
                            })
                            if(foundOpenPositionInSavedPositions===false){
                                closedPositions.push(savedPosition)
                            }
                        });
                        // loop through the closed positions and move them to closedTrades collection
                        for(const closedTrade_ of closedPositions){
                            const oldTradeToSave = {...closedTrade_};
                            delete oldTradeToSave._id;
                            await mongoDatabase.collection.oldTradesCollection.createNewDocument({
                                ...oldTradeToSave
                            })
                            // delete the positiion from open positions
                            await mongoDatabase.collection.openTradesCollection.deleteManyDocumentsByIds([closedTrade_._id])

                        }
                    }else if(traderPositions.length > traderSavedOpenPositions.length){
                        // some positions were added
                        /**
                         * @type {import("../../Binance_Scraper/getOtherPosition_API").PositionRetDataObject_Interface[]}
                         */
                        const newOpenPositions = [];
                        traderOpenPositions.forEach((openPosition_)=> {
                            let foundOpenPositionInSavedPositions = false;
                            traderSavedOpenPositions.forEach((savedPosition_)=>{
                                const openPositionDirection = openPosition_.amount>0?"LONG":"SHORT";
                                if(
                                    // openPosition.symbol === savedPosition.pair &&
                                    // openPosition.entryPrice === savedPosition.entry_price
                                    openPosition_.symbol === savedPosition_.pair &&
                                    openPosition_.leverage === savedPosition_.leverage &&
                                    openPositionDirection === savedPosition_.direction
                                    //savedPosition_.part===0

                                    ){
                                        foundOpenPositionInSavedPositions = true;
                                    }
                            })
                            if(foundOpenPositionInSavedPositions===false){
                                newOpenPositions.push(openPosition)
                            }
                        });
                        for(const newOpenPosition_ of newOpenPositions){
                            const savedOpenPosition = await mongoDatabase.collection.openTradesCollection.createNewDocument({
                                trader_id: savedTrader._id,
                                trader_uid: savedTrader.uid,
                                close_date: null,
                                direction: newOpenPosition_.amount<0?"SHORT":"LONG",
                                entry_price: newOpenPosition_.entryPrice,
                                followed: savedTrader && savedTrader.copied?true:false,
                                leverage: newOpenPosition_.leverage,
                                mark_price: newOpenPosition_.markPrice,
                                open_date: newOpenPosition_.updateTimeStamp,
                                original_size: newOpenPosition_.amount,
                                pair: newOpenPosition_.symbol,
                                part:0,
                                pnl:newOpenPosition_.pnl,
                                roi: newOpenPosition_.roe,
                                size: newOpenPosition_.amount,
                                status: "OPEN",
                                total_parts: 1
                            })

                            console.log({savedOpenPosition})

                        }
                    }else if(traderPositions.length === traderSavedOpenPositions.length) {
                        // positions length still the same
                        // check if size was adjusted in any of the positions
                        for(const savedPosition_ of  traderSavedOpenPositions){
                            for(const openPosition_ of traderOpenPositions){
                                const openPositionDirection = openPosition_.amount>0?"LONG":"SHORT"
                                if(
                                    openPosition_.symbol === savedPosition_.pair &&
                                    openPosition_.leverage === savedPosition_.leverage &&
                                    savedPosition_.direction=== openPositionDirection &&
                                    savedPosition_.part===0
                                ){
                                        if(Math.abs(savedPosition_.size)!==Math.abs(openPosition_.amount)){
                                            if(Math.abs(savedPosition_.size)>Math.abs(openPosition_.amount)){
                                                // If savedPositionSize is > than openPositionSizee
                                                // means a partial was closed
                                                const positionMinusOrPlusFixer = savedPosition_.direction==="SHORT"?-1:1;
                                                //1. Create a new old trade posiition for the closed partial
                                                const oldTradeToSave = {...savedPosition_}
                                                delete oldTradeToSave._id;
                                                await mongoDatabase.collection.oldTradesCollection.createNewDocument({
                                                    ...oldTradeToSave,
                                                    part: savedPosition_.total_parts,
                                                    size: positionMinusOrPlusFixer * Math.abs(savedPosition_.size)-Math.abs(openPosition_.amount),
                                                    status:"CLOSED",
                                                    close_date: binanceScraper.utils.closeNow().close_timestamp
                                                })
                                                //2. Update the size of the open trade

                                                await mongoDatabase.collection.openTradesCollection.updateDocument(savedPosition_._id,{
                                                    ...savedPosition_,
                                                    total_parts: savedPosition_.total_parts+1,
                                                    size: positionMinusOrPlusFixer * (Math.abs(savedPosition_.size) - (Math.abs(savedPosition_.size)-Math.abs(openPosition_.amount)))
                                                })
                                            }else if(Math.abs(savedPosition_.size)<Math.abs(openPosition_.amount) && savedPosition_.part===0){
                                                //If savedPositionSize is < openPositionSize
                                                //means that the size for the position was increased
                                                //so:1. Update the position size
                                                await mongoDatabase.collection.openTradesCollection.updateDocument(savedPosition_._id,{
                                                    ...savedPosition_,
                                                    original_size: openPosition_.amount,
                                                    size: openPosition_.amount
                                                })
                                            }
                                        }

                                }
                            }
                            // move the save positions to the old trades collection
                            const oldTradeToSave = {...savedPosition_};
                            delete oldTradeToSave._id;
                            await mongoDatabase.collection.oldTradesCollection.createNewDocument({
                                ...oldTradeToSave
                            })
                            // delete the positiion from open positions
                            await mongoDatabase.collection.openTradesCollection.deleteManyDocumentsByIds([savedPosition_._id])
    
                        }
                    }else {
                        console.log("traderPositions.otherPositionRetList.length (no any equality condition) traderSavedOpenPositions.length")
                    }

                    // 

                }
            }else {/// Atrade has openPositions but no savedPositions
                if(traderHasOpenPositions){
                    const traderOpenPositions = traderPositions//.otherPositionRetList.map((p)=> p)
                    for(const newOpenPosition_ of traderOpenPositions){
                        // saving positions for the first time
                        await mongoDatabase.collection.openTradesCollection.createNewDocument({
                            trader_id: savedTrader._id,
                            trader_uid: savedTrader.uid,
                            close_date: null,
                            direction: newOpenPosition_.direction,
                            entry_price: newOpenPosition_.entryPrice,
                            followed: savedTrader && savedTrader.copied?true:false,
                            leverage: newOpenPosition_.leverage,
                            mark_price: newOpenPosition_.markPrice,
                            open_date: newOpenPosition_.updateTimeStamp,
                            original_size: newOpenPosition_.amount,
                            pair: newOpenPosition_.symbol,
                            part:0,
                            pnl:newOpenPosition_.pnl,
                            roi: newOpenPosition_.roe,
                            size: newOpenPosition_.amount,
                            status: "OPEN",
                            total_parts: 1
                        })

                    }

                }
            }

        }

        await mongoDatabase.disconnect()

        await sleepAsync(5000)
    }catch(e){
        console.log(e);
        
    }

    
}
    browser.close();
})()