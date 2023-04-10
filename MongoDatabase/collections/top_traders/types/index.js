/**
 * @typedef  {{
 *      unique_number: string,
 *      uid: string
 *      username:string|null,
 *      average_concurrent_trades: number, 
 *      average_trade_count_value: number,
 *      averages_last_uptade_timestamp: number,
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
 *      followed: boolean,
 *      updatedOn:number,
 *      weight: number,
 *      totalROI: number,
 *      SharpeRatio: number,
 *      MaxDrawdown: number,
 *      WinRate: number,
 *      server_timezone:string 
 * }} TopTrader_Interface
 */

/**
 * @typedef {import("mongodb").WithId<TopTrader_Interface>} TopTraderCollection_Document_Interface 
 */



module.exports = {};