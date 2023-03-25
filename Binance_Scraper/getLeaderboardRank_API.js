// const {performFetch} = require("../Utils/performFetch")
const  {  Browser, Page} =  require('puppeteer');
/**
 * @typedef  {{
 *      encryptedUid: string,
 *      followerCount: number,
 *      futureUid: null|string,
 *      isTwTrader: boolean,
 *      nickName: string |null,
 *      openId: null|string,
 *      pnl: number,
 *      positionShared: boolean,
 *      rank: number,
 *      roi: number,
 *      twShared: null,
 *      twitterUrl: null|string,
 *      updateTime: number,
 *      userPhotoUrl: string|""
 * }} BinanceUser_Interface
 */

/**
 * 
 * @typedef {{
 *      code : "000000",
 *      "message":null,
 *      messageDetails: null,
 *      success: boolean,
 *      data: BinanceUser_Interface[]
 * }} GetLeaderboardRank_Response_Interface
 */

/**
 * @typedef {{
 *      isShared: boolean,
 *      isTrader: boolean,
 *      periodType: import('./types').PeriodType_Types,
 *      statisticsType: import('./types').StaticticsType_Types,
 *      tradeType: import('./types').TradeType_Types
 * }} GetOtherLeaderboardBaseInfo_API_Payload_Interface
 */


/***
 * @param {Page} page
 * @param {GetOtherLeaderboardBaseInfo_API_Payload_Interface} payload 
 * @returns {GetLeaderboardRank_Response_Interface} 
 */
exports.getLeaderboardRank_API = async function getLeaderboardRank_API(page,payload){
    try {
        console.log("[method:getLeaderboardRank]")
        const res = await page.evaluate(async (payload)=>{
            const url = "https://www.binance.com/bapi/futures/v3/public/future/leaderboard/getLeaderboardRank";
            const host = "www.binance.com";
            const pathname = "/bapi/futures/v3/public/future/leaderboard/getLeaderboardRank"
            const method = "POST";
            const postBody = JSON.stringify(payload)

            
            const res = await fetch(url,{
                method,
                body:postBody,
                credentials:"include",
                headers:{
                    "Content-Type":"application/json",
                    "User-Agent":"Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36"
                }
            }); 
            const resCopy = res.clone();
            try{
                /***
                 * @type {GetLeaderboardRank_Response_Interface}
                 * 
                 */
                let resJson = await res.json();
                // console.log(res)
                if(resJson.code!=="000000"){
                    // an error occcurred
                    throw new Error(resJson.message)
                }else {
                    return resJson;
                }
            }catch(error){
                const text = await resCopy.text()
                throw new Error(text);
            }



        },payload)
        // const res = await getLeaderboardRank()
        return res;
    }catch(error){
        throw error;
    }
}



module.exports.BinanceTrader = class BinanceTrader {
    /**
     * @type {BinanceUser_Interface}
     */
    #traderData;
    /**
     * @param {BinanceUser_Interface} traderPayload_Interface
     */
    constructor(traderPayload_Interface){
        this.#traderData = traderPayload_Interface;
    }

    //utils
    toJson(){
        return this.#traderData;
    };
    get encryptedUid(){
        return this.#traderData.encryptedUid;
    }
    get followerCount(){
        return this.#traderData.followerCount;
    }
    get futureUid(){
        return this.#traderData.futureUid;
    }
    get isTwTrader(){
        return this.#traderData.isTwTrader;
    }
    get nickName(){
        return this.#traderData.nickName;
    }
    get openId(){
        return this.#traderData.openId;
    }
    get pnl(){
        return this.#traderData.pnl
    }
    get positionShared(){
        return this.#traderData.positionShared;
    }
    get rank(){
        return this.#traderData.rank;
    }
    get roi(){
        return this.#traderData.roi;
    }
    get twShared(){
        return this.#traderData.twShared;
    }
    get twitterUrl(){
        return this.#traderData.twitterUrl;
    }
    get updateTime(){
        return this.#traderData.updateTime;
    }
    get userPhotoUrl(){
        return this.userPhotoUrl;
    }
}