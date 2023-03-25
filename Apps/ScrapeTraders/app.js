/**
 * Scrape traders once per day and save/update in db;
 */

const {BinanceScraper,createPuppeteerBrowser} = require("../../Binance_Scraper");
const {MongoDatabase} = require("../../MongoDatabase");
const {sleepAsync} = require("../../Utils/sleepAsync");
const {readAndConfigureDotEnv} = require("../../Utils/readAndConfigureDotEnv");
const dotEnvObj = readAndConfigureDotEnv(); 

process.env.TZ = dotEnvObj.TZ;
process.env.DATABASE_URI = dotEnvObj.DATABASE_URI;
process.env.DATABASE_NAME = dotEnvObj.DATABASE_NAME;
process.env.IS_LIVE = dotEnvObj.IS_LIVE
console.log(process.env);
const IS_LIVE = false;
console.log(IS_LIVE);
(async ()=>{
    /**
     * @type {number}
     */
    let lastScrapedDayNumber = -1;
    while(true){
        const TODAY_DAY_NUMBER = new Date().getDay();
        while(lastScrapedDayNumber!==TODAY_DAY_NUMBER){// Scrape when day changes
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
                const binanceTradersAndTheirInfo = await binance.getTradersTheirInfoStatistics(page,{
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
                    const {performance:traderPerformance,trader} = binanceTraderInfo;
                   
                    const traderPerformanceIsAvailable = traderPerformance.length>0;
                    const performancePeriodTypesAvailable = traderPerformance.map((performance)=> performance.periodType);
                    //a. save trader to db if not already saved
                    const savedTrader = await mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(trader.encryptedUid);
                    console.log({savedTrader,username:trader.toJson()})
                    if(!savedTrader){
                        //trader in db not found
                        // create in db
                        mongoDatabase.collection.topTradersCollection.createNewDocument({
                            username: trader.nickName,
                            uid: trader.encryptedUid,
                            copied: false,
                            followed: false,
                            allPNL: traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("ALL")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="ALL" && performance.statisticsType==="PNL"){
                                    return performance
                                }
                            })[0].value,
                            allROI: traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("ALL")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="ALL" && performance.statisticsType==="ROI"){
                                    return performance
                                }
                            })[0].value,
                            dailyPNL: traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("DAILY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="DAILY" && performance.statisticsType==="PNL"){
                                    return performance
                                }
                            })[0].value,
                            dailyROI: traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("DAILY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="DAILY" && performance.statisticsType==="ROI"){
                                    return performance
                                }
                            })[0].value,
                            weeklyPNL:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("WEEKLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="WEEKLY" && performance.statisticsType==="PNL"){
                                    return performance
                                }
                            })[0].value,
                            weeklyROI:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("WEEKLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="WEEKLY" && performance.statisticsType==="ROI"){
                                    return performance
                                }
                            })[0].value,
                            monthlyPNL:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("MONTHLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="MONTHLY" && performance.statisticsType==="PNL"){
                                    return performance
                                }
                            })[0].value,
                            monthlyROI:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("MONTHLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="MONTHLY" && performance.statisticsType==="ROI"){
                                    return performance
                                } 
                            })[0].value,
                            yearlyPNL:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("YEARLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="YEARLY" && performance.statisticsType==="PNL"){
                                    return performance
                                }
                            })[0].value,
                            yearlyROI:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("YEARLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="YEARLY" && performance.statisticsType==="ROI"){
                                    return performance
                                }
                            })[0].value,
                            // exacts
                            exactWeeklyPNL:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("EXACT_WEEKLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="EXACT_WEEKLY" && performance.statisticsType==="PNL"){
                                    return performance
                                }
                            })[0].value,
                            exactWeeklyROI:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("EXACT_WEEKLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="EXACT_WEEKLY" && performance.statisticsType==="ROI"){
                                    return performance
                                }
                            })[0].value,
                            exactMonthlyPNL:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("EXACT_MONTHLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="EXACT_MONTHLY" && performance.statisticsType==="PNL"){
                                    return performance
                                }
                            })[0].value,
                            exactMonthlyROI:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("EXACT_MONTHLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="EXACT_MONTHLY" && performance.statisticsType==="ROI"){
                                    return performance
                                }
                            })[0].value,
                            exactYearlyPNL:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("EXACT_YEARLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="EXACT_YEARLY" && performance.statisticsType==="PNL"){
                                    return performance
                                }
                            })[0].value,
                            exactYearlyROI:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("EXACT_YEARLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="EXACT_YEARLY" && performance.statisticsType==="ROI"){
                                    return performance
                                }
                            })[0].value,
                            
                        })
                    }else {
                        // trader is available // needs update
                        await mongoDatabase.collection.topTradersCollection.updateDocument(savedTrader._id,{
                            username: trader.nickName,
                            uid: trader.encryptedUid,
                            copied: savedTrader.copied,
                            followed: savedTrader.followed,
                            allPNL: traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("ALL")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="ALL" && performance.statisticsType==="PNL"){
                                    return performance
                                }
                            })[0].value,
                            allROI: traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("ALL")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="ALL" && performance.statisticsType==="ROI"){
                                    return performance
                                }
                            })[0].value,
                            dailyPNL: traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("DAILY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="DAILY" && performance.statisticsType==="PNL"){
                                    return performance
                                }
                            })[0].value,
                            dailyROI: traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("DAILY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="DAILY" && performance.statisticsType==="ROI"){
                                    return performance
                                }
                            })[0].value,
                            weeklyPNL:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("WEEKLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="WEEKLY" && performance.statisticsType==="PNL"){
                                    return performance
                                }
                            })[0].value,
                            weeklyROI:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("WEEKLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="WEEKLY" && performance.statisticsType==="ROI"){
                                    return performance
                                }
                            })[0].value,
                            monthlyPNL:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("MONTHLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="MONTHLY" && performance.statisticsType==="PNL"){
                                    return performance
                                }
                            })[0].value,
                            monthlyROI:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("MONTHLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="MONTHLY" && performance.statisticsType==="ROI"){
                                    return performance
                                } 
                            })[0].value,
                            yearlyPNL:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("YEARLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="YEARLY" && performance.statisticsType==="PNL"){
                                    return performance
                                }
                            })[0].value,
                            yearlyROI:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("YEARLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="YEARLY" && performance.statisticsType==="ROI"){
                                    return performance
                                }
                            })[0].value,
                            // exacts
                            exactWeeklyPNL:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("EXACT_WEEKLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="EXACT_WEEKLY" && performance.statisticsType==="PNL"){
                                    return performance
                                }
                            })[0].value,
                            exactWeeklyROI:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("EXACT_WEEKLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="EXACT_WEEKLY" && performance.statisticsType==="ROI"){
                                    return performance
                                }
                            })[0].value,
                            exactMonthlyPNL:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("EXACT_MONTHLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="EXACT_MONTHLY" && performance.statisticsType==="PNL"){
                                    return performance
                                }
                            })[0].value,
                            exactMonthlyROI:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("EXACT_MONTHLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="EXACT_MONTHLY" && performance.statisticsType==="ROI"){
                                    return performance
                                }
                            })[0].value,
                            exactYearlyPNL:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("EXACT_YEARLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="EXACT_YEARLY" && performance.statisticsType==="PNL"){
                                    return performance
                                }
                            })[0].value,
                            exactYearlyROI:traderPerformanceIsAvailable===false || performancePeriodTypesAvailable.includes("EXACT_YEARLY")===false?0:traderPerformance.filter((performance)=> {
                                if(performance.periodType==="EXACT_YEARLY" && performance.statisticsType==="ROI"){
                                    return performance
                                }
                            })[0].value,
                        })
                    }
                    // :: At this area a doc has been inserted
                    // const savedTraderDbDoc = await mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(trader.encryptedUid);
    
                }

                await browser.close()
                await mongoDatabase.disconnect();
                lastScrapedDayNumber = TODAY_DAY_NUMBER;
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
        const min30 = (1000*60)*30;
        await sleepAsync(min30)         
    }
})()