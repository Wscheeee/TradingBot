//@ts-check

const {Web3} = require("web3");
const HOST = "http://82.208.21.186";
// const HOST = "http://localhost";
const PORT = "8545";



// Locals
const {listenForNewTransanctions} = require("./listenForNewTransactions");
const { listentForLogs_UniswapV2 } = require("./listenForSwapLogs_UniswapV2");
const { listentForLogs_UniswapV3 } = require("./listenForSwapLogs_UniswapV3");
const {getABI}  = require("./getABI");
// const HTTPprovider = new Web3.providers.HttpProvider(
//     `${HOST}:${PORT}`
// );

const HTTPprovider = new Web3.providers.HttpProvider(
    ""
);
const WSProvider = new Web3.providers.WebsocketProvider(
);


const uniswapV3_SwapLogs_ABI_json = require("./uniswap/abi/v3/swapABI.json");

const {
    abi: UNISWAP_V3_FACTORY_ABI,
    // bytecode,
} = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json");
const {
    abi: UNISWAP_V3_POOL_ABI,
    // bytecode,
} = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json");
// console.log({abi});

// deploy the bytecode

// const provider = WSProvider ;//HTTPprovider;
(async ()=>{
    try{
        
        // Web3.utils.keccak256Wrapper()
        // const web3 = new Web3(`${HOST}:${PORT}`);
        // console.log({provider});
        const web3_HTTP = new Web3(HTTPprovider);
        const web3_WS = new Web3(WSProvider);
        console.log(web3_HTTP.eth.eventNames());
        const nodeInfo = await web3_HTTP.eth.getNodeInfo();
        console.log({nodeInfo});
        const latestBlockNumber = await web3_HTTP.eth.getBlockNumber();
        console.log({latestBlockNumber});

        let ruun = false;  
        await listentForLogs_UniswapV2(web3_WS,web3_HTTP,"",(err,transation,log)=>{
            // console.log({uniswap:"V2",err,transation,log});
            try{

                if(!log)return;
                if(ruun)return;
                ruun = true;
                const address = log.address;
                // const abi = await getABI({address});
                console.log({UNISWAP_V3_POOL_ABI});
                // web3_HTTP.et

                const decodedLogParams = web3_HTTP.eth.abi.decodeLog(UNISWAP_V3_FACTORY_ABI,log.data,log.topics.slice(1,));
                console.log({uniswap:"V2",err,transation,log,decodedLogParams});
            }catch(error){
                console.log({error,ruun});
            }
        });
        // await listentForLogs_UniswapV3(web3_WS,web3_HTTP,"",async(err,transation,log)=>{
        //     try{

        //         if(!log)return;
        //         if(ruun)return;
        //         ruun = true;
        //         const address = log.address;
        //         // const abi = await getABI({address});
        //         console.log({UNISWAP_V3_POOL_ABI});
        //         web3_HTTP.et

        //         const decodedLogParams = web3_HTTP.eth.abi.decodeLog(UNISWAP_V3_POOL_ABI,log.data,log.topics);
        //         console.log({uniswap:"V3",err,transation,log,decodedLogParams});
        //     }catch(error){
        //         console.log({error,ruun});
        //     }
        // });

    }catch(error){
        console.log(error);
    }
})();










































// const geth = require("geth");

// var options = {
//     networkid: "10101",
//     port: 30303,
//     rpcport: 8545,
//     mine: null
// };
 
// // geth.start(options, function (err, proc) {
// //     if (err) return console.error(err);
// //     // get your geth on!
// // });
// geth.start(options,{
//     stdout: function (data) {
//         process.stdout.write("I got a message!! " + data.toString());
//     },
//     stderr: function (data) {
//         if (data.toString().indexOf("Protocol Versions") > -1) {
//             geth.trigger(null, geth.proc);
//         }
//     },
//     close: function (code) {
//         console.log("It's game over, man!  Game over!");
//     }
// }, function (err, proc) {
//     if (err) return console.error(err);
//     // get your geth on!
// });

// // geth.stop(function () {
// //     // no more lively times :( 
// // });