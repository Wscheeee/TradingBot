// const {performFetch} = require("../Utils/performFetch")
const  {  Browser, Page} =  require('puppeteer');
// types
const {TradeType_Types, PeriodType_Types, StaticticsType_Types} = require("./types/index")
/**
 * @typedef  {{
 *      periodType:PeriodType_Types,
 *      rank: number,
 *      statisticsType: StaticticsType_Types,
 *      value: number
 * }} PerformanceDataObject_Interface
 */

/**
 * 
 * @typedef {{
 *      code : "000000"|"000002",
 *      "message":null,
 *      messageDetails: null,
 *      success: boolean,
 *      data: {
 *          lastTradeTime: number,
 *          performanceRetList: PerformanceDataObject_Interface[]
 *      }
 * }} GetOtherPerformance_API_Response_Interface
 */

/**
 * @typedef {{encryptedUid:string, tradeType:TradeType_Types}} GetOtherPerformance_API_Payload_Interface
 */
/***
 * @param {Page} page
 * @param {GetOtherPerformance_API_Payload_Interface} payload
 * @returns {GetOtherPerformance_API_Response_Interface} 
 */
exports.getOtherPerformance_API = async function getOtherPerformance_API(page,payload){
    try {
        console.log("[method:getOtherPerformance_API]")
        const res = await page.evaluate(async ({encryptedUid,tradeType})=>{
            const url = "https://www.binance.com/bapi/futures/v2/public/future/leaderboard/getOtherPerformance";
            const method = "POST";
            
            /**
             * @type {GetOtherPerformance_API_Payload_Interface}
             */
            const requestPayload = {
                encryptedUid,
                tradeType
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




module.exports.BinanceTraderPerfomance = class BinanceTraderPerfomance {
    /**
     * @type {PerformanceDataObject_Interface}
     */
    #performanceData;
    /**
     * @param {PerformanceDataObject_Interface} performancePayload_Interface
     */
    constructor(performancePayload_Interface){
        this.#performanceData = performancePayload_Interface;
    }
    //utils
    toJson(){
        return this.#performanceData;
    };
    get periodType(){
        return this.#performanceData.periodType;
    }
    get rank(){
        return this.#performanceData.rank;
    }
    get statisticsType(){
        return this.#performanceData.statisticsType;
    }
    get value(){
        return this.#performanceData.value;
    }

}