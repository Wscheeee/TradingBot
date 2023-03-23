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
 *      data: BinanceOtherLeaderboardBaseInfo_Interface
 * }} GetOtherLeaderboardBaseInfo_API_Response_Interface
 */
/**
 * @typedef {{encryptedUid:string}} GetOtherLeaderboardBaseInfo_Payload_Interface
 */

/***
 * @param {Page} page
 * @param {{encryptedUid:string}} payload
 * @returns {GetOtherLeaderboardBaseInfo_API_Response_Interface} 
 */
exports.getOtherLeaderboardBaseInfo_API = async function getOtherLeaderboardBaseInfo_API(page,payload){
    try {
        console.log("[method:getOtherLeaderboardBaseInfo_API]")
        const res = await page.evaluate(async ({encryptedUid})=>{
            const url = "https://www.binance.com/bapi/futures/v2/public/future/leaderboard/getOtherLeaderboardBaseInfo";
            const method = "POST";
            
            /**
             * @type {GetOtherLeaderboardBaseInfo_Payload_Interface}
             */
            const requestPayload = {
                encryptedUid
            };

            const postBody = JSON.stringify(requestPayload)

            /***
             * @type {GetOtherLeaderboardBaseInfo_API_Response_Interface}
             */
            const res = await fetch(url,{
                method,
                body:postBody,
                credentials:"include",
                headers:{
                    "Content-Type":"application/json",
                    "User-Agent":"Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36"
                }
            }).then(res => {
                const resCopy = res.clone();
                try {
                    return res.json()

                }catch(e){
                    throw resCopy.text()
                }
            })
            // console.log(res)
            if(res.code!=="000000"){
                // an error occcurred
                throw new Error(res.message)
            }else {
                return res;
            }
        },payload)
        // const res = await getLeaderboardRank()
        return res;
    }catch(error){
        throw error;
    }
}

