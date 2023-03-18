/***
 * This class exports methods to interact wit binance leaderboard and extract data.
 * It uses puppeteer and an api.
 */
const  {  Browser, Page} =  require('puppeteer');
const {getLeaderboardRank_API,BinanceUser_Interface} = require("./getLeaderboardRank_API");
const { getOtherLeaderboardBaseInfo_API, GetOtherLeaderboardBaseInfo_Payload_Interface} = require("./getOtherLeaderboardBaseInfo_API");
const {getOtherPerformance_API,GetOtherPerformance_API_Payload_Interface} = require("./getOtherPerformance_API")
const {getOtherPosition_API, GetOtherPosition_API_Payload_Interface} = require("./getOtherPosition_API");



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
     * @param {import('./getLeaderboardRank_API').GetOtherLeaderboardBaseInfo_API_Payload_Interface} getLeaderboardRankUsers_Payload
     * @returns 
     */
    async getLeaderboardRankUsers(page,getLeaderboardRankUsers_Payload){
        try {
            console.log("[method:getLeaderboardRank]")
            return (await getLeaderboardRank_API(page,getLeaderboardRankUsers_Payload)).data
        }catch(err){
            throw err;
        }
    }


    /**
     * 
     * @param {Page} page 
     * @param {GetOtherLeaderboardBaseInfo_Payload_Interface} getOtherLeaderboardBaseInfo_payload
     */
    async getOtherLeaderboardBaseInfo(page,getOtherLeaderboardBaseInfo_payload){
        try{
            return (await getOtherLeaderboardBaseInfo_API(page,getOtherLeaderboardBaseInfo_payload)).data
            
        }catch(error){
            throw error;
        }
    }
    /**
     * @param {Page} page 
     * @param {GetOtherPerformance_API_Payload_Interface} getOtherPerformance_Payload
     */
    async getOtherPerformance(page,getOtherPerformance_Payload){
        try{
            return (await getOtherPerformance_API(page,getOtherPerformance_Payload)).data
            
        }catch(error){
            throw error;
        }
    }

    /**
     * @param {Page} page 
     * @param {GetOtherPosition_API_Payload_Interface} getOtherPosition_Payload
     */
    async getOtherPosition(page,getOtherPosition_Payload){
        try{
            return (await getOtherPosition_API(page,getOtherPosition_Payload)).data
            
        }catch(error){
            throw error;
        }
    }
    

}