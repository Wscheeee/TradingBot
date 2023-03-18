// const {performFetch} = require("../Utils/performFetch")
const  {  Browser, Page} =  require('puppeteer');
/**
 * @typedef  {{
 *      deliveryPosiitionShared:boolean,
 *      followerCount: number,
 *      followingCount: number,
 *      introduction: string|"",
 *      isTwTrader: boolean,
 *      nickName: string|null,
 *      openId: null|string,
 *      portfolioId: string | null,
 *      positionShared: boolean,
 *      twShared: boolean,,
 *      twitterUrl: null|string,
 *      userPhotoUrl: string|""
 * }} BinanceOtherLeaderboardBaseInfo_Interface
 */

/**
 * 
 * @typedef {{
 *      code : "000000"|"000002",
 *      "message":null,
 *      messageDetails: null,
 *      success: boolean,
 *      data: BinanceUser_Interface[]
 * }} GetLeaderboardRank_Response_Interface
 */

/***
 * @param {Page} page
 * @returns {GetLeaderboardRank_Response_Interface} 
 */
exports.getOtherLeaderboardBaseInfo_API = async function getOtherLeaderboardBaseInfo_API(page,encryptedUid){
    try {
        console.log("[method:getOtherLeaderboardBaseInfo_API]")
        const res = await page.evaluate(async (encryptedUid)=>{
            const url = "https://www.binance.com/bapi/futures/v2/public/future/leaderboard/getOtherLeaderboardBaseInfo";
            const host = "www.binance.com";
            const pathname = "/bapi/futures/v3/public/future/leaderboard/getLeaderboardRank"
            const method = "POST";
            /**
             * @typedef {{encryptedUid:string}} GetOtherLeaderboardBaseInfo_Payload_Interface
             */
            /**
             * @type {GetOtherLeaderboardBaseInfo_Payload_Interface}
             */
            const requestPayload = {
                encryptedUid
            };

            const postBody = JSON.stringify(requestPayload)

            /***
             * @type {GetLeaderboardRank_Response_Interface}
             */
            const res = await fetch(url,{
                method,
                body:postBody,
                credentials:"include",
                headers:{
                    "Content-Type":"application/json",
                    "User-Agent":"Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36"
                }
            }).then(res => res.json())
            console.log(res)
            if(res.code!=="000000"){
                // an error occcurred
                throw new Error(res.message)
            }else {
                return res;
            }
        },encryptedUid)
        // const res = await getLeaderboardRank()
        return res;
    }catch(error){
        throw error;
    }
}

