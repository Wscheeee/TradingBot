/**
 * @typedef  {{
 *      unique_number: string,
 *      uid: string
 *      username:string|null,
 *      average_concurrent_trades: number, 
 *      average_trade_count_value: number,
 *      averages_last_uptade_timestamp: number,
 *      daily_pnl: number,
 *      daily_roi: number,
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
 *      performances_last_uptade_timestamp: number,
 *      copied: boolean,
 *      followed: boolean,
 *      last_uptade_timestamp:number,
 *      weight: number,
 *      total_roi: number,
 *      sharpe_ratio: number,
 *      max_drawdown: number,
 *      winrate: number,
 *      server_timezone:string ,
 *      created_on_timestamp: number
 * }} TopTrader_Interface
 */

/**
 * @typedef {import("mongodb").WithId<TopTrader_Interface>} TopTraderCollection_Document_Interface 
 */



module.exports = {};