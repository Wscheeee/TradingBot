/**
 * @typedef {{
*   username: string,
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
*   atomos: true
* }} User_Interface 
*/

/**
* @typedef {import("mongodb").WithId<User_Interface>} Users_Collection_Document_Interface
*/


module.exports = {};

// const userSchema = new mongoose.Schema({  username: { type: String, default: 0 },
//     userId: { type: Number, default: 0 },  chatId: { type: Number, default: 0 },
//     language: { type: String, default: 0 },  daysLeft: { type: Number, default: 0 },
//     todayDate: { type: Date, default: 0 },  firstDate: { type: Date, default: 0 },
//     totalMonths: { type: Number, default: 0 },  totalPaid: { type: Number, default: 0 },
//     status: { type: Boolean, default: false },  traderOne: { type: Boolean, default: false },
//     traderTwo: { type: Boolean, default: false },  traderThree: { type: Boolean, default: false },
//     traderFour: { type: Boolean, default: false },  traderFive: { type: Boolean, default: false },
//     traderSix: { type: Boolean, default: false },  traderSeven: { type: Boolean, default: false },
//     traderEight: { type: Boolean, default: false },  traderNine: { type: Boolean, default: false },
//     traderTen: { type: Boolean, default: false },  traderEleven: { type: Boolean, default: false },
//     traderTwelve: { type: Boolean, default: false },  traderThirteen: { type: Boolean, default: false },
//     traderFourteen: { type: Boolean, default: false },  traderFifteen: { type: Boolean, default: false },
//     traderSixteen: { type: Boolean, default: false },  traderSeventeen: { type: Boolean, default: false },
//     traderEighteen: { type: Boolean, default: false },  traderNineteen: { type: Boolean, default: false },
//     traderTwenty: { type: Boolean, default: false },}, {
//     collection: 'Users'});