
const {performFetch} = require("../Utils/performFetch");

const https = require("https");

function performRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => {
                data += chunk;
            });
            res.on("end", () => {
                try{
                    resolve(JSON.parse(data));
                }catch(error){
                    resolve(data);

                }
            });
        });
        req.on("error", (error) => {
            reject(error);
        });
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

// const fetch = require("node-fetch");
/**
 * 
 * @param {{address:string}} param0 
 */
module.exports.getABI = async function({address}){
    const FUNCTION_NAME = "(fn:getABI)";
    try{
        // const URL = "api.etherscan.io";
        const API_KEY = "56MGIG6ZNMIEVZDH2NT77ZSF9EYXMZ8VTJ";
        //         https://api.etherscan.io/api
        //    ?module=contract
        //    &action=getabi
        //    &address=0xBB9bc244D798123fDe783fCc1C72d3Bb8C189413
        //    &apikey=YourApiKeyToken
        // const response = await performFetch({
        //     method:"GET",
        //     host:"api.etherscan.io/",
        //     pathname:"/api?module=contract&action=getabi&address="+address+"&apikey="+API_KEY,
        //     headers:{
        //         "Content-Type":"application/json",
        //         "User-Agent":"Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36"
        //     }
        // });

        const options = {
            method: "GET",
            hostname: "api.etherscan.io",
            path: "/api?module=contract&action=getabi&address=0xfb6916095ca1df60bb79ce92ce3ea74c37c5d359&apikey="+API_KEY,
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36",
            },
        };
          
        const response = await performRequest(options);
        // .then((data) => {
        //     console.log("Response:", data);
        // })
        // .catch((error) => {
        //     console.error("Error:", error);
        // });
          

        console.log({response});
        let contractABI = "";
        if(response.result){
            contractABI = JSON.parse(response.result);

        }
        // save the abi in 
        return contractABI;
        // if (contractABI != ""){
        //     var MyContract = web3.eth.contract(contractABI);
        //     var myContractInstance = MyContract.at("0xfb6916095ca1df60bb79ce92ce3ea74c37c5d359");
        //     var result = myContractInstance.memberId("0xfe8ad7dd2f564a877cc23feea6c0a9cc2e783715");
        //     console.log("result1 : " + result);            
        //     var result = myContractInstance.members(1);
        //     console.log("result2 : " + result);
        // } else {
        //     console.log("Error" );
        // }            
    }catch(error){
        error.message = `${FUNCTION_NAME} ${error.message}`;
        throw error;
    }
};//56MGIG6ZNMIEVZDH2NT77ZSF9EYXMZ8VTJ