/***
 * This class exports methods to interact wit binance leaderboard and extract data.
 * It uses puppeteer and an api.
 */
const  {  Browser, Page} =  require('puppeteer');
const {getLeaderboardRank_API,BinanceUser_Interface} = require("./getLeaderboardRank_API");
const { getOtherLeaderboardBaseInfo_API} = require("./getOtherLeaderboardBaseInfo_API");

const {createPuppeteerBrowser} = require("./createPuppeteerBrowser");

/**
 * @template {T}
 * @typedef {{isLive:boolean, browser:Browser}} SettingsObject_Interface 
 */

module.exports.BinanceScraper = class BinanceScraper {
    binanceURLS = {
        leaderBoardFuturesPage: "https://www.binance.com/en/futures-activity/leaderboard/futures",
    }

    /**
     * @type {SettingsObject_Interface}
     */
    #settings;
   
    /**
     * @param {SettingsObject_Interface} settings;
     */
    constructor(settings){
        this.#settings = settings;
    };


    async createNewPage(){
        try {
            if(!this.#settings.browser) throw new Error("First Create a browser")
            const page = await this.#settings.browser.newPage()
            page.setDefaultNavigationTimeout(0)
            return page;
        }catch(error){
            throw error;
        }
    }

    /**
     * 
     * @param {Page} param0 
     * @returns {boolean}
     */
    async closePage({page}){
        try {
            if(page){
                await page.close();
                return true;
            }
        }catch(error){
            throw error;
        }
    }

    /**
     * 
     * @param {Page} page 
     * @param {string} pageUrl 
     * @returns {Promise<HTTPResponse | null>}
     */
    async navigateToUrl(page,pageUrl){
        try {
            return await page.goto(pageUrl,{waitUntil:"networkidle0"});
        }catch(error){
            throw error;
        }
    }



    /**
     * 
     * @param {Page} page 
     */
    async openLeaderboardFuturesPage(page){
        try {
            const pageUrl = this.binanceURLS.leaderBoardFuturesPage;
            return await this.navigateToUrl(page,pageUrl);
        }catch(error){
            throw error;
        }
    }


    /**
     * 
     * @param {Page} page 
     * @returns 
     */
    async getLeaderboardRankUsers(page){
        try {
            console.log("[method:getLeaderboardRank]")
            return (await getLeaderboardRank_API(page)).data
        }catch(err){
            throw err;
        }
    }


    /**
     * 
     * @param {Page} page 
     * @param {string} userUid
     */
    async getOtherLeaderboardBaseInfo(page,userUid){
        try{
            return (await getOtherLeaderboardBaseInfo_API(page,userUid)).data
            
        }catch(error){
            throw error;
        }
    }
    

}