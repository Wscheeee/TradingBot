const {BinanceScraper} = require("../index");
const {createPuppeteerBrowser} = require("../createPuppeteerBrowser");
(async ()=>{
    try{
        console.log("Running binanceScraper app")
        const browser = await createPuppeteerBrowser({
            IS_LIVE: false,
            browserRevisionToDownload:"901912",
            devtools: true,
            headless:true,
            downloadBrowserRevision: false
        })
        const binanceScraper = new BinanceScraper({isLive:false,browser:browser})
        const page = await binanceScraper.createNewPage();
        await binanceScraper.openLeaderboardFuturesPage(page)
        const leaderBoardUsers = await binanceScraper.getLeaderboardRankUsers(page);
        const uid = "9D382AAAED16C245AEE83C8292E65A87"
        const userData = await binanceScraper.getOtherLeaderboardBaseInfo(page,uid);
        console.log({userData})
    }catch(e){
        console.log(e);
        
    }

})()