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

/***
 * @param {Page} page
 * @returns {GetLeaderboardRank_Response_Interface} 
 */
exports.getLeaderboardRank_API = async function getLeaderboardRank(page){
    try {
        console.log("[method:getLeaderboardRank]")
        const res = await page.evaluate(async ()=>{
            const url = "https://www.binance.com/bapi/futures/v3/public/future/leaderboard/getLeaderboardRank";
            const host = "www.binance.com";
            const pathname = "/bapi/futures/v3/public/future/leaderboard/getLeaderboardRank"
            const method = "POST";
            const requestPayload = {
                isShared:true,
                isTrader:false,
                periodType: "WEEKLY",
                statisticsType: "ROI",
                tradeType: "PERPETUAL"
            }
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
        })
        // const res = await getLeaderboardRank()
        return res;
    }catch(error){
        throw error;
    }
}
// exports.getLeaderboardRank = async function getLeaderboardRank(){
//     try {
//         console.log("[method:getLeaderboardRank]")
//         const url = "https://www.binance.com/bapi/futures/v3/public/future/leaderboard/getLeaderboardRank";
//         const host = "www.binance.com";
//         const pathname = "/bapi/futures/v3/public/future/leaderboard/getLeaderboardRank"
//         const method = "POST";
//         const requestPayload = {
//             isShared:true,
//             isTrader:false,
//             falseperiodType: "WEEKLY",
//             statisticsType: "ROI",
//             tradeType: "PERPETUAL"
//         }
//         const postBody = JSON.stringify(requestPayload)
    
//         const requestHeader = {
//             // ":authority": "www.binance.com",
//             // ":method": "POST",
//             // ":path": "/bapi/futures/v3/public/future/leaderboard/getLeaderboardRank",
//             // ":scheme": "https",
//             "accept": "*/*",
//             "accept-encoding": "gzip, deflate, br",
//             "accept-language": "en-US,en;q=0.9",
//             "bnc-uuid": "c61a74cc-15c4-4e8b-88db-e56a5dce0aab",
//             "clienttype": "web",
//             "content-length": postBody.length, //"103",
//             "content-type": "application/json",
//             "cookie": `cid=bZG55Ivd; __BNC_USER_DEVICE_ID__={"b7c11a275dc1f320aef70abc2a3b93ef":{"date":1659767045961,"value":"1659767045649FLve4DKEE08KZABzbJm"}}; fan-token-init-compliance=null; bnc-uuid=c61a74cc-15c4-4e8b-88db-e56a5dce0aab; source=organic; campaign=www.google.com; _gcl_au=1.1.360473971.1678691207; userPreferredCurrency=USD_USD; _cq_duid=1.1678691213.AIAmm8DQjVkwtidQ; BNC_FV_KEY=323ec5c11bfba090aeba4c655764433e3ee6cffc; _ga=GA1.1.1065022595.1678691195; fiat-prefer-currency=EUR; _ga_3WP50LGEEC=GS1.1.1678691216.1.1.1678691448.60.0.0; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%22186d9cb0cc71fd-0a2f0e65d68ffa8-17462c6c-1049088-186d9cb0cc8209%22%2C%22first_id%22%3A%22%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTg2ZDljYjBjYzcxZmQtMGEyZjBlNjVkNjhmZmE4LTE3NDYyYzZjLTEwNDkwODgtMTg2ZDljYjBjYzgyMDkifQ%3D%3D%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%22%2C%22value%22%3A%22%22%7D%2C%22%24device_id%22%3A%22186d9cb0cc71fd-0a2f0e65d68ffa8-17462c6c-1049088-186d9cb0cc8209%22%7D; OptanonAlertBoxClosed=2023-03-14T14:59:07.862Z; _uetvid=d4905410b5f211ec8fb9d341408f0313; monitor-uuid=675373f0-abd5-424a-8c6c-433a14ddbf7e; BNC_FV_KEY_EXPIRE=1679060204941; OptanonConsent=isGpcEnabled=0&datestamp=Fri+Mar+17+2023+10%3A56%3A58+GMT%2B0300+(East+Africa+Time)&version=6.39.0&isIABGlobal=false&hosts=&consentId=7047b401-a3d2-483d-aa8f-eacef1becc9f&interactionCount=2&landingPath=NotLandingPage&groups=C0001%3A1%2CC0003%3A0%2CC0004%3A0%2CC0002%3A0&AwaitingReconsent=false&geolocation=NL%3BZH; lang=en; theme=dark`,
//             "csrftoken": "d41d8cd98f00b204e9800998ecf8427e",
//             "device-info": "eyJzY3JlZW5fcmVzb2x1dGlvbiI6Ijc2OCwxMzY2IiwiYXZhaWxhYmxlX3NjcmVlbl9yZXNvbHV0aW9uIjoiNzQxLDEzNjYiLCJzeXN0ZW1fdmVyc2lvbiI6IkxpbnV4IHg4Nl82NCIsImJyYW5kX21vZGVsIjoidW5rbm93biIsInN5c3RlbV9sYW5nIjoiZW4tVVMiLCJ0aW1lem9uZSI6IkdNVCszIiwidGltZXpvbmVPZmZzZXQiOi0xODAsInVzZXJfYWdlbnQiOiJNb3ppbGxhLzUuMCAoWDExOyBMaW51eCB4ODZfNjQpIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS8xMTAuMC4wLjAgU2FmYXJpLzUzNy4zNiIsImxpc3RfcGx1Z2luIjoiIiwiY2FudmFzX2NvZGUiOiJhNWIxZGE4MyIsIndlYmdsX3ZlbmRvciI6Ikdvb2dsZSBJbmMuIChJbnRlbCBPcGVuIFNvdXJjZSBUZWNobm9sb2d5IENlbnRlcikiLCJ3ZWJnbF9yZW5kZXJlciI6IkFOR0xFIChJbnRlbCBPcGVuIFNvdXJjZSBUZWNobm9sb2d5IENlbnRlciwgTWVzYSBEUkkgSW50ZWwoUikgSEQgR3JhcGhpY3MgNDAwIChCU1cpLCBPcGVuR0wgNC42KSIsImF1ZGlvIjoiMTI0LjA0MzQ3NTI3NTE2MDc0IiwicGxhdGZvcm0iOiJMaW51eCB4ODZfNjQiLCJ3ZWJfdGltZXpvbmUiOiJBZnJpY2EvTmFpcm9iaSIsImRldmljZV9uYW1lIjoiQ2hyb21lIFYxMTAuMC4wLjAgKExpbnV4KSIsImZpbmdlcnByaW50IjoiNDQ1OTFlODcxNmJmZGI0OTExMjAxMzA4ZTJkZDgxZGQiLCJkZXZpY2VfaWQiOiIiLCJyZWxhdGVkX2RldmljZV9pZHMiOiIxNjU5NzY3MDQ1NjQ5Rkx2ZTRES0VFMDhLWkFCemJKbSJ9",
//             "fvideo-id": "323ec5c11bfba090aeba4c655764433e3ee6cffc",
//             "lang": "en",
//             "origin": "https://www.binance.com",
//             "referer": "https://www.binance.com/en/futures-activity/leaderboard/futures",
//             "sec-ch-ua": `"Google Chrome";v="111", "Not(A:Brand";v="8", "Chromium";v="111"`,
//             "sec-ch-ua-mobile": "?1",
//             "sec-ch-ua-platform": "Android",
//             "sec-fetch-dest": "empty",
//             "sec-fetch-mode": "cors",
//             "sec-fetch-site": "same-origin",
//             "user-agent": `Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36`,
//             "x-trace-id": "205a6a08-3712-4063-a730-17f26be7a223",
//             "x-ui-request-trace": "205a6a08-3712-4063-a730-17f26be7a223"
//         }
    
    
//         const res = await performFetch({
//             method,
//             host,
//             pathname,
//             headers:requestHeader,

//             // headers:{
//             //     "Content-Type":"application/json"
//             // }
//         },postBody)
//         console.log(res)
//         return res
//     }catch(error){
//         throw error;
//     }
// }
