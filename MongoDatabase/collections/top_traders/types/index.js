/**
 * @typedef  {{
 *      unique_number: string,
 *      uid: string
 *      username:string,
 *      estimated_total_balance?: number,
 *      trader_base_allocation: number,
 *      daily_pnl: number,
 *      daily_roi: number,
 *      past_day_roi: number,
 *      past_day_pnl: number,
 *      weekly_pnl: number,
 *      weekly_roi: number,
 *      monthly_pnl: number,
 *      monthly_roi: number,
 *      yearly_pnl: number,
 *      yearly_roi: number,
 *      exact_weekly_pnl: number,
 *      exact_weekly_roi: number,
 *      exact_monthly_pnl: number,
 *      exact_monthly_roi: number,
 *      exact_yearly_pnl: number,
 *      exact_yearly_roi: number, 
 *      all_pnl: number,
 *      all_roi: number,
 *      performances_last_uptade_datetime: Date,
 *      followed: boolean,
 *      total_roi: number,
 *      sharpe_ratio: number,
 *      max_drawdown: number,
 *      winrate: number,
 *      server_timezone:string ,
 *      document_created_at_datetime:Date,
 *      document_last_edited_at_datetime:Date,
 * }} TopTraderDocument_Interface
 */

/**
 * @typedef {import("mongodb").WithId<TopTraderDocument_Interface>} TopTraderCollection_Document_Interface 
 */

// /**
//  * @typedef {import("mongodb").Filter<TopTraderDocument_Interface>} TopTraderDocument_Interface_Filtered
//  */



module.exports = {};