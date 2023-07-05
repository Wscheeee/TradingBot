//@ts-check
/**
 * @param {import("web3").Web3} web3_ws
 * @param {import("web3").Web3} web3_http
 * @param {string} transactionHash
 * @param {(error?:Error,transaction?:any,transactionHash?:string)=>any} cb
 */
module.exports.listenForNewTransanctions = async function (web3_ws, web3_http, transactionHash, cb){
    const FUNCTION_NAME = "(fn:listenForNewTransanctions)";
    try {
        const eventEmiiter = await web3_ws.eth.subscribe("pendingTransactions",{
            address: ["0x1a272503b5590fc5ef3e84cfd1534fd4766323ef"],
            topics: ["0x1a272503b5590fc5ef3e84cfd1534fd4766323ef"]
        });
        eventEmiiter.on("data",async (transationHash_)=>{
            try{
                const transaction = await web3_http.eth.getTransaction(transationHash_);
                // console.log({transationHash_});
                cb(undefined,transaction,transationHash_);

            }catch(error){
                cb(error,null,transationHash_);
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


