const axios = require("axios");
const fs = require("fs");

const {PROXY_FILE_PATH} = require("./constants");

let proxyPool = [];
let proxyIndex = 0;

const loadProxies = () => {
    const proxyData = fs.readFileSync(PROXY_FILE_PATH, "utf-8");
    proxyPool = proxyData.trim().split("\n").map(proxy => {
        const [host, port] = proxy.split(":");
        return { host, port: parseInt(port, 10) };
    });
};

const getNextProxy = () => {
    const proxy = proxyPool[proxyIndex];
    proxyIndex = (proxyIndex + 1) % proxyPool.length;
    return proxy;
};

const sendRequestWithProxy = async (url, config = {}, maxRetries = 5) => {
    loadProxies(); // Reload proxies from file

    let attempts = 0;

    while (attempts < maxRetries) {
        const nextProxy = getNextProxy();
        console.log(`Attempt ${attempts + 1}, using proxy: ${JSON.stringify(nextProxy)}`);

        try {
            const response = await axios({
                ...config,
                url,
                proxy: nextProxy,
            });

            return response.data;
        } catch (error) {
            console.error(`Request failed with proxy ${JSON.stringify(nextProxy)}. Error: ${error.message}`);
            attempts++;
        }
    }

    throw new Error(`Failed to make a successful request after ${maxRetries} retries.`);
};


// // Example usage
// const runExample = async () => {
//     try {
//         const url = "https://api.example.com/data";
//         const response1 = await sendRequestWithProxy(url);
//         console.log("Response 1:", response1);
//     } catch (error) {
//         console.error("Example failed:", error);
//     }
// };

// runExample();


module.exports.sendRequestWithProxy = sendRequestWithProxy;