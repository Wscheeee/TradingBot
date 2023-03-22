/***
 * This class exports methods to interact wit binance leaderboard and extract data.
 * It uses puppeteer and an api.
 */
const  {  Browser, Page} =  require('puppeteer');
const {getLeaderboardRank_API,BinanceUser_Interface,BinanceTrader} = require("./getLeaderboardRank_API");
const { getOtherLeaderboardBaseInfo_API, GetOtherLeaderboardBaseInfo_Payload_Interface} = require("./getOtherLeaderboardBaseInfo_API");
const {getOtherPerformance_API,GetOtherPerformance_API_Payload_Interface,GetOtherPerformance_API_Response_Interface,BinanceTraderPerfomance} = require("./getOtherPerformance_API")
const {getOtherPosition_API, GetOtherPosition_API_Payload_Interface, BinancePosition} = require("./getOtherPosition_API");



// const {createPuppeteerBrowser} = require("./createPuppeteerBrowser");

/**
* @typedef {{
* performance: BinanceTraderPerfomance[],
* positions: BinancePosition[],
* trader: BinanceTrader
* }} TraderInfo_Interface
**/

/**
 * @template {T}
 * @typedef {{isLive:boolean, browser:Browser}} SettingsObject_Interface 
 */

module.exports.BinanceScraper = class BinanceScraper {
    binanceURLS = {
        leaderBoardFuturesPage: "https://www.binance.com/en/futures-activity/leaderboard/futures",
    }

    // utils
    utils = {
        closeNow: ()=>({
            close_timestamp: Date.now()
        })
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
            const getTradersResponseData =  (await getLeaderboardRank_API(page,getLeaderboardRankUsers_Payload)).data;
            return getTradersResponseData.map(t => new BinanceTrader(t));
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
            const performaceRespData =  (await getOtherPerformance_API(page,getOtherPerformance_Payload)).data
            return performaceRespData.performanceRetList.map(p => new BinanceTraderPerfomance(p))
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
            const positionsResponseData =  (await getOtherPosition_API(page,getOtherPosition_Payload)).data
            if(positionsResponseData && positionsResponseData.otherPositionRetList && positionsResponseData.otherPositionRetList.length>0){
                return positionsResponseData.otherPositionRetList.map(p => new BinancePosition(p))
            }else {
                return [];
            }
        }catch(error){
            throw error;
        }
    }
    


    /**
     * @param {Page} page 
     * @param {import('./getLeaderboardRank_API').GetOtherLeaderboardBaseInfo_API_Payload_Interface} getLeaderboardRankUsers_Payload
     */
    async getTradersTheirInfoAndPositions(page,getLeaderboardRankUsers_Payload){
        try{
            const traders = await this.getLeaderboardRankUsers(page,getLeaderboardRankUsers_Payload);
    
    
            /**
             * @typedef {{
             * performance: BinanceTraderPerfomance[],
             * positions: BinancePosition[],
             * trader: BinanceTrader
             * }} TraderInfo_Interface
             */
            /***
             * @type {TraderInfo_Interface[]}
             */
            const tradersAndTheirInfo = []
            // loop each trader and get their positions and perfomance
            for(const trader of traders){
                const traderPerformace = await this.getOtherPerformance(page,{encryptedUid:trader.encryptedUid,tradeType:'PERPETUAL'});
                const traderPositions = await this.getOtherPosition(page,{encryptedUid:trader.encryptedUid, tradeType:"PERPETUAL"})
    
                /**
                 * @type {TraderInfo_Interface}
                 */
                const traderInfo = {
                    performance: traderPerformace,
                    positions: traderPositions,
                    trader: trader
                };
    
                tradersAndTheirInfo.push(traderInfo)
            }

            return tradersAndTheirInfo;

        }catch(e){
            throw e;
        }
    }


}