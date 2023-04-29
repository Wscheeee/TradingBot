// subAccounts Collection format :
//sub_name: 'sub_1'
//trader_username:
//trader_uid: 'traderUID'
//weight: '0.1'
//tg_user_id: 'id'
//public_api
//private_api


/**
 * @typedef {{
 *      name: string,
 *      trader_username: string,
 *      trader_uid: string,
 *      weight: number,
 *      tg_user_id: number,
 *      puplic_api: string,
 *      private_api: string,
 *      testnet: boolean
 * }} Sub_Account_Document_Interface
 */

/**
 * @typedef {import("mongodb").WithId<Sub_Account_Document_Interface>} Sub_Account_Collection_Document_Interface
 */

module.exports = {};