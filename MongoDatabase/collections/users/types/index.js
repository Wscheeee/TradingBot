/**
 * @typedef {{
*   username: string,
*   testnet: boolean,
*   tg_user_id: number,
*   chatId: number,
*   language: "english"|"francais",
*   daysLeft: number,
*   updateDate: Date,
*   firstDate: Date,
*   totalMonths: number,
*   totalPaid: number,
*   status: Boolean,
*   copiedTraders: string[],
*   atomos: boolean,
*   totalPnl: number,
*   totalRoi: number,
*   publicKey: string,
*   privateKey: string,
*   atomos: true,
*   last_sub_allocation_check_datetime: undefined| string
* }} User_Interface 
*/

/**
* @typedef {import("mongodb").WithId<User_Interface>} Users_Collection_Document_Interface
*/


module.exports = {};

