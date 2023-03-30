"use-strict";
//@ts-check


// const {Bybit} = require("./Bybit")
const {Bybit_LinearClient} = require("./Bybit_LinearClient")
const {Bybit_RestClientV5} = require("./Bybit_RestClientV5")

module.exports = {
    Bybit_RestClientV5, Bybit_LinearClient
}

// {
//     closeRes: {
//       retCode: 10002,
//       retMsg: 'invalid request, please check your server timestamp or recv_window param. req_timestamp[1680180102752],server_timestamp[1680180108039],recv_window[5000]',
//       result: {},
//       retExtInfo: {},
//       time: 1680180108040
//     }
//   }