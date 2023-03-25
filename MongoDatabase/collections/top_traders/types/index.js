const {ObjectId,WithId} = require("mongodb")

/**
 * @typedef  {{
 *      _id?:string
 *      uid: string
 *      username:string|null,
 *      url:string,
 *      dailyPNL: number,
 *      dailyROI: number,
 *      weeklyPNL: number,
 *      weeklyROI: number,
 *      monthlyPNL: number,
 *      monthlyROI: number,
 *      yearlyPNL: number,
 *      yearlyROI: number,
 *      exactWeeklyPNL: number,
 *      exactWeeklyROI: number,
 *      exactMonthlyPNL: number,
 *      exactMonthlyROI: number,
 *      exactYearlyPNL: number,
 *      exactYearlyROI: number, 
 *      allPNL: number,
 *      allROI: number,
 *      copied: boolean,
 *      followed: boolean
 * }} TopTrader_Interface
 */

/**
 * @typedef {{_id:ObjectId}} DocumentIDAdded_interface
 */
/**
 * @typedef { TopTrader_Interface} TopTraderCollection_Document_Interface 
 * @property {{_id:ObjectId}}
 */



module.exports = {}