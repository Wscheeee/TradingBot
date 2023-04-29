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
 *      sub_account_name: string,
 *      trader_uid: string,
 *      weight: number,
 *      testnet: boolean
 * }} Sub_Account_Config_Document_Interface
 */

/**
 * @typedef {import("mongodb").WithId<Sub_Account_Config_Document_Interface>} Sub_Account_Config_Collection_Document_Interface
 */

module.exports = {};