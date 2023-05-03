/**
 * @typedef {{
 *      sub_account_username: string,
 *      trader_username: string,
 *      trader_uid: string,
 *      weight: number,
 *      tg_user_id: number,
 *      puplic_api: string,
 *      private_api: string,
 *      testnet: boolean,
 *      sub_account_uid: number, 
 *      sub_link_name: string,
 *      server_timezone:string,
 *      document_created_at_datetime:Date
 * }} Sub_Account_Document_Interface
 */

/**
 * @typedef {import("mongodb").WithId<Sub_Account_Document_Interface>} Sub_Account_Collection_Document_Interface
 */

module.exports = {};