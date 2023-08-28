const {BinanceScraper} = require("../index");
const {createPuppeteerBrowser} = require("../createPuppeteerBrowser");
const {getNextProxy,loadProxies} = require("../../Proxy");
(async ()=>{
    try{
        console.log("Running binanceScraper app")
        loadProxies()
        const proxy = getNextProxy();
        console.log({proxy});
        const browser = await createPuppeteerBrowser({
            IS_LIVE: false,
            browserRevisionToDownload:"901912",
            devtools: true,
            headless:true,
            downloadBrowserRevision: false,
            proxyServer: `${proxy.host}:${proxy.port}` 
        })
        const binanceScraper = new BinanceScraper({isLive:false,browser:browser})
        const page = await binanceScraper.createNewPage();
        await binanceScraper.openLeaderboardFuturesPage(page)
        const leaderBoardUsers = await binanceScraper.getLeaderboardRankUsers(page,{
            isShared:true,
            isTrader:false,
            periodType: "WEEKLY",
            statisticsType: "ROI",
            tradeType: "PERPETUAL"
        });
        console.log("leaderBoardUsers\=============",leaderBoardUsers)
        const uid = "9D382AAAED16C245AEE83C8292E65A87"
        const userBaseInfo = await binanceScraper.getOtherLeaderboardBaseInfo(page,{encryptedUid:uid});
        console.log("userBaseInfo\=============",userBaseInfo)
        const userPositions = await binanceScraper.getOtherPosition(page,{encryptedUid:uid, tradeType:"PERPETUAL"})
        console.log("userPositions\=============",userPositions)
    }catch(e){
        console.log(e);
        
    }

})()