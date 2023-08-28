// const {performFetch} = require("../Utils/performFetch")
const  {  Browser, Page} =  require("puppeteer");
// types
const {TradeType_Types , StaticticsType_Types} = require("./types/index");

/**
 * 
 * @typedef {"DAILY"|"WEEKLY"|"EXACT_WEEKLY"|"EXACT_YEARLY"|"EXACT_MONTHLY"|"MONTHLY"|"YEARLY"|"ALL"} PerformancePeriodType_Types
 * @typedef {"ROI"|"PNL"} Performance_StaticticsType_Types
 */

/**
 * @typedef  {{
 *      periodType:PerformancePeriodType_Types,
 *      rank: number,
 *      statisticsType: Performance_StaticticsType_Types,
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
    const FUNCTION_NAME = "[method:getOtherPerformance_API]";
    try {
        console.log(FUNCTION_NAME);
        
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

            const postBody = JSON.stringify(requestPayload);


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
                 * @type {GetOtherPerformance_API_Response_Interface}
                 * 
                 */
                let resJson = await res.json();
                // console.log(res)
                if(resJson.code!=="000000"){
                    // an error occcurred
                    throw new Error(resJson.message);
                }else {
                    return resJson;
                }
            }catch(error){
                const text = await resCopy.text();
                throw new Error(text);
            }
            
        },payload);
        // const res = await getLeaderboardRank()
        return res;
    }catch(error){
        error.message  = `${FUNCTION_NAME} ${error.message}`;
        throw error;
    }
};




// module.exports.BinanceTraderPerfomance = //
class BinanceTraderPerfomance {
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
    }

    // getters
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

// utils

/**
 * 
 * @param {BinanceTraderPerfomance[]} performanceList 
 * @param {{periodType:PerformancePeriodType_Types,statisticsType:Performance_StaticticsType_Types}} param1 
 * @param {number|undefined} defaultValue
 */
module.exports.getValueForPerformance = function getValueForPerformance(performanceList,{periodType,statisticsType},defaultValue=0){
    const defaultValue_ = defaultValue||0;
    /**
     * @type {{[performancePeriodType in PerformancePeriodType_Types]?:Performance_StaticticsType_Types[]}}
    */
    const performancePeriodTypesAvailableAndTheirAvailableStatTypes = {};
    performanceList.forEach((performance)=> {
        if(!performancePeriodTypesAvailableAndTheirAvailableStatTypes[performance.periodType]){
            performancePeriodTypesAvailableAndTheirAvailableStatTypes[performance.periodType] = [];
        }
        performancePeriodTypesAvailableAndTheirAvailableStatTypes[performance.periodType].push(performance.statisticsType);

    });

    const performancePeriodTypesAvailable = performanceList.map((performance)=> performance.periodType);
    // const performanceStatisticsTypesAvailable = performanceList.map((performance)=> performance.statisticsType);
    const traderPerformanceIsAvailable = performanceList.length>0;

    if(!traderPerformanceIsAvailable) return defaultValue_;
 
    if(performancePeriodTypesAvailable.includes(periodType)===false ||
        performancePeriodTypesAvailableAndTheirAvailableStatTypes[periodType].includes(statisticsType)===false
    )return defaultValue_;
    let v = defaultValue_;
    performanceList.filter((performance)=> {
        if(performance.periodType===periodType && performance.statisticsType===statisticsType){
            v = performance && performance.value? performance.value: defaultValue_;
        }
    });
    return v;

};

module.exports.BinanceTraderPerfomance = BinanceTraderPerfomance;

