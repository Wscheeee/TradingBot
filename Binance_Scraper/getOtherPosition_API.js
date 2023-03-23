const  {  Browser, Page} =  require('puppeteer');
// types
const {TradeType_Types, PeriodType_Types, StaticticsType_Types} = require("./types/index")

/**
 * @typedef {[year:number,month:number,day:number,hour:number,minute:number,second:number,ms:number]} UpdateTime_Interface
 */
/**
 * @typedef  {{
 *      amount: number,
 *      entryPrice: number,
 *      leverage: number,
 *      markPrice: number,
 *      pnl: number,
 *      roe: number,
 *      symbol: string,
 *      tradeBefore: boolean,
 *      updateTime: UpdateTime_Interface,
 *      updateTimeStamp: number,
 *      yellow: boolean
 * }} PositionRetDataObject_Interface
 */

/**
 * 
 * @typedef {{
 *      code : "000000"|"000002",
 *      message:null,
 *      messageDetails: null,
 *      success: boolean,
 *      data: {
 *          otherPositionRetList:PositionRetDataObject_Interface[],
 *          updateTime: UpdateTime_Interface,
 *          updateTimeStamp: number
 *      }
 * }} GetOtherPosition_API_Response_Interface
 */

/**
 * @typedef {{
 *      encryptedUid:string, tradeType:TradeType_Types
 *  }} GetOtherPosition_API_Payload_Interface
 */
/***
 * @param {Page} page
 * @param {GetOtherPosition_API_Payload_Interface} payload
 * @returns {GetOtherPosition_API_Response_Interface} 
*/
exports.getOtherPosition_API = async function getOtherPosition_API(page,payload){
    try {
        console.log("[method:getOtherPosition_API]")
        const res = await page.evaluate(async ({encryptedUid,tradeType})=>{
            const url = "https://www.binance.com/bapi/futures/v1/public/future/leaderboard/getOtherPosition";
            const method = "POST";
            
            /**
             * @type {GetOtherPosition_API_Payload_Interface}
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






// CLASS

module.exports.BinancePosition =  class BinancePosition {
    /**
     * @type {PositionRetDataObject_Interface}
     */
    #positionData;
    /**
     * @type {"LONG"|"SHORT"}
     */
    #direction;
    /**
     * @param {PositionRetDataObject_Interface} positionPayload_Interface
     */
    constructor(positionPayload_Interface){
        this.#positionData = positionPayload_Interface;
        this.#direction = positionPayload_Interface.amount<0?"SHORT":"LONG";
    }

    //utils
    toJson(){
        return this.#positionData;
    };

    get direction(){
        return this.#direction;
    }
    get amount(){
        return Math.abs(this.#positionData.amount)
    }

    get entryPrice(){
        return this.#positionData.entryPrice;
    }
    get leverage(){
        return this.#positionData.leverage;
    }
    get markPrice(){
        return this.#positionData.markPrice;
    }
    get pnl(){
        return this.#positionData.pnl;
    }
    get roe(){
        return this.#positionData.roe;
    }
    get symbol(){
        return this.#positionData.symbol;
    }
    get tradeBefore(){
        return this.#positionData.tradeBefore;
    }
    get updateTime(){
        return this.#positionData.updateTime;
    }
    get updateTimeStamp(){
        return this.#positionData.updateTimeStamp;
    }
    get yellow(){
        return this.#positionData.yellow;
    }

};

