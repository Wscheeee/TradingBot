const {BinanceScraper} = require("../index");
const {createPuppeteerBrowser} = require("../createPuppeteerBrowser");
(async ()=>{
    try{
        console.log("Running binanceScraper app")
        const browser = await createPuppeteerBrowser({
            IS_LIVE: false,
            browserRevisionToDownload:"901912",
            devtools: true,
            headless:false,
            downloadBrowserRevision: false
        })
        const binanceScraper = new BinanceScraper({isLive:false,browser:browser})
        const page = await binanceScraper.createNewPage();
        await binanceScraper.openLeaderboardFuturesPage(page)
        const leaderBoardUsers = await binanceScraper.getLeaderboardRankUsers(page)
        console.log({leaderBoardUsers})
    }catch(e){
        console.log(e);
        
    }

})()