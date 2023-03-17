const  { BrowserFetcher, Browser, launch} =  require('puppeteer');
const path = require('path');


/***
 *@param {{IS_LIVE:boolean, devtools:boolean, headless: boolean,downloadBrowserRevision:boolean,browserRevisionToDownload:"901912" }} param0
 *@returns {Promise<Browser>} 
 */
exports.createPuppeteerBrowser =  async function createPuppeteerBrowser({
    IS_LIVE,devtools,headless,downloadBrowserRevision,browserRevisionToDownload
}){
    /**
     * @type {Browser|null}
     */
    let browser = null;
    try {
        const browserDownloadPath = path.join(__dirname,"files");// is inside the build folder so only created when download happens
        // ccheck if browser already downloaded
        let canDownloadBrowserRevision = false;
        const browserRevsionToDownload = browserRevisionToDownload;
        const browserFetcher = new BrowserFetcher({path:browserDownloadPath,product:"chrome"});
        const localRevisions = browserFetcher.localRevisions();
        console.log("Local Revisions:",browserFetcher.localRevisions())
        if(localRevisions.includes(browserRevsionToDownload)==false && downloadBrowserRevision){
            console.log("Downloadable revision not downloaded!")
            canDownloadBrowserRevision = await browserFetcher.canDownload(browserRevsionToDownload)
        }else {
            console.log("Downloadable revision already downloaded!")
        };
        console.log({canDownloadBrowserRevision})
        if(canDownloadBrowserRevision && downloadBrowserRevision){
            console.log("Downloading browser revision: ",browserRevsionToDownload)
            const revisionInfo = await browserFetcher.download(browserRevsionToDownload);
            console.log("Download complete...")
            if(revisionInfo){
                // create browser
                browser = await launch({
                    ...()=>(IS_LIVE?{args: ['--no-sandbox', '--disable-setuid-sandbox']}:{}),
                    executablePath: revisionInfo.executablePath,
                    headless:headless,devtools:devtools});
                console.log("Browser created: revision:",canDownloadBrowserRevision)
            };

        }else {};
        if(!browser){
            // create browser
            console.log("Using default browser")
            browser = await launch({
                ...()=>(IS_LIVE?{args: ['--no-sandbox', '--disable-setuid-sandbox']}:{}),
                headless:headless,devtools:devtools});
            console.log("Default Browser created")
        }
        if(!browser){
            throw new Error("Could not create Browser")
        }else {
            return browser;
        }
    }catch(error){
        if(browser){
            await browser.close()
        }
        throw error;
    }
}