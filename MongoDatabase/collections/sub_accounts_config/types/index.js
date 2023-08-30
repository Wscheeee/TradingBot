// subAccounts Collection format :
//sub_name: 'sub_1'
//trader_username:
//trader_uid: 'traderUID'
//weight: '0.1'
//tg_user_id: 'id'
//public_api
//private_api


/**
 * The username is randon generated
 * @typedef {{
 *      trader_uid: string,
 *      weight: number,
 *      sub_link_name: string,
 *      trader_username: string,
 *      allocaion: number,
 * }} Sub_Account_Config_Document_Interface
 */

/**
 * @typedef {import("mongodb").WithId<Sub_Account_Config_Document_Interface>} Sub_Account_Config_Collection_Document_Interface
 */

module.exports = {};