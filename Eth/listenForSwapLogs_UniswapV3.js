//@ts-check
/**
 * @param {import("web3").Web3} web3_ws
 * @param {import("web3").Web3} web3_http
 * @param {string} transactionHash
 * @param {(error?:Error,transaction?:any,logsOutput?:import("web3").LogsOutput)=>any} cb
 */
module.exports.listentForLogs_UniswapV3 = async function (web3_ws, web3_http, transactionHash, cb){
    const FUNCTION_NAME = "(fn:listentForLogs_UniswapV3)";
    try {
        const eventEmiiter = await web3_ws.eth.subscribe("logs",{
            // address: ["0x1a272503b5590fc5ef3e84cfd1534fd4766323ef"],
            // topics: ["0xSwapEventSignature"]
            topics: ["0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"]
        });
        eventEmiiter.on("data",async (logsOutput)=>{
            try{
                // console.log({logsOutput});
                const transactionHash = logsOutput.transactionHash;
                if(transactionHash){
                    const transaction = await web3_http.eth.getTransaction(transactionHash);
                    cb(undefined,transaction,logsOutput);

                }

            }catch(error){
                cb(error,null);
            }
        });

        eventEmiiter.on("error",async (error)=>{
            cb(error);
            await eventEmiiter.unsubscribe();
        });


        // const newPendingTransactions_eventEmiiter = await web3_ws.eth.subscribe("newPendingTransactions",async (error,transationHash_)=>{
        //     if(error){
        //         // console.error(error);
        //         cb(error);
        //     }else {
        //         const transaction = await web3_http.eth.getTransaction(transationHash_);
        //         cb(undefined,transaction);
        //     }
        // });
        // newPendingTransactions_eventEmiiter.on("error",async (error)=>{
        //     cb(error);
        //     await newPendingTransactions_eventEmiiter.unsubscribe();
        // });
    }catch(error){
        throw new Error(`${FUNCTION_NAME} ${error.message}`);
    }
};


