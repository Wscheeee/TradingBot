const {BinanceScraper,createPuppeteerBrowser} = require("../../Binance_Scraper");
const {MongoDatabase} = require("../../MongoDatabase");
const {sleepAsync} = require("../../Utils/sleepAsync");
const {positionsHandler} = require("./positionsHandler");
const {readAndConfigureDotEnv} = require("../../Utils/readAndConfigureDotEnv");
const dotEnvObj = readAndConfigureDotEnv(); 

process.env.TZ = dotEnvObj.TZ;
process.env.DATABASE_URI = dotEnvObj.DATABASE_URI;
process.env.DATABASE_NAME = dotEnvObj.DATABASE_NAME;
console.log(process.env);
const IS_LIVE = false;
(async ()=>{
    while(true){
        let mongoDatabase = null;
        let browser = null;
        try{
            /**
             * 0. Create db and Create a browser 
             */
            mongoDatabase = new MongoDatabase(process.env.DATABASE_URI);
            await mongoDatabase.connect(process.env.DATABASE_NAME);
            browser = await createPuppeteerBrowser({
                IS_LIVE,
                browserRevisionToDownload:"901912",
                devtools: true,
                headless:true,
                downloadBrowserRevision: false
            });
            const page = await browser.newPage()
            page.setDefaultNavigationTimeout(0);
            /**
             * 1. Get traders and their info
             */
            const binance = new BinanceScraper({
                browser,isLive:IS_LIVE
            });
            await binance.openLeaderboardFuturesPage(page);
            const binanceTradersAndTheirInfo = await binance.getTradersTheirInfoAndPositions(page,{
                isShared:true,
                isTrader:false,
                periodType: "WEEKLY",
                statisticsType: "ROI",
                tradeType: "PERPETUAL"
            });


            // console.log({binanceTradersAndTheirInfo})

            /**
             * 2. Loop through the traders and their info and save or edit the required;
             */
            for(const binanceTraderInfo of binanceTradersAndTheirInfo){
                const {performance:traderPerformace,positions,trader} = binanceTraderInfo;
               
                const traderPerformanceIsAvailable = traderPerformace.length>0;
                //a. save trader to db if not already saved
                const savedTrader = await mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(trader.encryptedUid);
                console.log({savedTrader})
                if(!savedTrader){
                    //trader in db not found
                    // create in db
                    mongoDatabase.collection.topTradersCollection.createNewDocument({
                        username: trader.nickName,
                        uid: trader.encryptedUid,
                        copied: false,
                        allPNL: trader.pnl,
                        allROI: trader.roi,
                        dailyPNL: traderPerformanceIsAvailable===false?0:traderPerformace.filter((performance)=> {
                            if(performance.periodType==="DAILY" && performance.statisticsType==="PNL"){
                                return performance
                            }
                        })[0].value,
                        dailyROI: traderPerformanceIsAvailable===false?0:traderPerformace.filter((performance)=> {
                            if(performance.periodType==="DAILY" && performance.statisticsType==="ROI"){
                                return performance
                            }
                        })[0].value,
                        monthlyPNL:traderPerformanceIsAvailable===false?0:traderPerformace.filter((performance)=> {
                            if(performance.periodType==="MONTHLY" && performance.statisticsType==="PNL"){
                                return performance
                            }
                        })[0].value,
                        monthlyROI:traderPerformanceIsAvailable===false?0:traderPerformace.filter((performance)=> {
                            if(performance.periodType==="MONTHLY" && performance.statisticsType==="ROI"){
                                return performance
                            }
                        })[0].value,
                        weeklyPNL:traderPerformanceIsAvailable===false?0:traderPerformace.filter((performance)=> {
                            if(performance.periodType==="WEEKLY" && performance.statisticsType==="PNL"){
                                return performance
                            }
                        })[0].value,
                        weeklyROI:traderPerformanceIsAvailable===false?0:traderPerformace.filter((performance)=> {
                            if(performance.periodType==="WEEKLY" && performance.statisticsType==="ROI"){
                                return performance
                            }
                        })[0].value,
                        url:""
                    })
                }else {
                    // trader is available // needs update
                    await mongoDatabase.collection.topTradersCollection.updateDocument(savedTrader._id,{
                        username: trader.nickName,
                        uid: trader.encryptedUid,
                        copied: savedTrader.copied,
                        allPNL: trader.pnl, 
                        allROI: trader.roi,
                        dailyPNL: traderPerformanceIsAvailable===false?0:traderPerformace.filter((performance)=> {
                            if(performance.periodType==="DAILY" && performance.statisticsType==="PNL"){
                                return performance
                            }
                        })[0].value,
                        dailyROI: traderPerformanceIsAvailable===false?0:traderPerformace.filter((performance)=> {
                            if(performance.periodType==="DAILY" && performance.statisticsType==="ROI"){
                                return performance
                            }
                        })[0].value,
                        monthlyPNL:traderPerformanceIsAvailable===false?0:traderPerformace.filter((performance)=> {
                            if(performance.periodType==="MONTHLY" && performance.statisticsType==="PNL"){
                                return performance
                            }
                        })[0].value,
                        monthlyROI:traderPerformanceIsAvailable===false?0:traderPerformace.filter((performance)=> {
                            if(performance.periodType==="MONTHLY" && performance.statisticsType==="ROI"){
                                return performance
                            }
                        })[0].value,
                        weeklyPNL:traderPerformanceIsAvailable===false?0:traderPerformace.filter((performance)=> {
                            if(performance.periodType==="WEEKLY" && performance.statisticsType==="PNL"){
                                return performance
                            }
                        })[0].value,
                        weeklyROI:traderPerformanceIsAvailable===false?0:traderPerformace.filter((performance)=> {
                            if(performance.periodType==="WEEKLY" && performance.statisticsType==="ROI"){
                                return performance
                            }
                        })[0].value,
                        url:savedTrader.url
                    })
                }
                // :: At this area a doc has been inserted
                // const savedTraderDbDoc = await mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(trader.encryptedUid);

                
            }
            //::## WORK ON POSITIONS
            await positionsHandler(binanceTradersAndTheirInfo,mongoDatabase)

            await browser.close()
            await mongoDatabase.disconnect();
            await sleepAsync(5000)
        }catch(e){
            if(browser){
                await browser.close()
            }
            if(mongoDatabase){
                await mongoDatabase.disconnect();
            }
            console.log(e);
            
        }

        
    }
})()