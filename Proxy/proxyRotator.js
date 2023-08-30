//@ts-check
const axios = require("axios");
const fs = require("fs");

const {PROXY_FILE_PATH} = require("./constants");



class ProxyRotator {
    /**
     * @type {{host:string,port:number}[]}
     */
    proxyPool = [];
    proxyIndex = 0;
    constructor(){

    }
    loadProxies(){
        console.log("Loading proxies...");
        
        const proxyData = fs.readFileSync(PROXY_FILE_PATH, "utf-8");
        this.proxyPool = proxyData.trim().split("\n").map(proxy => {
            const [host, port] = proxy.split(":");
            return { host, port: parseInt(port, 10) };
        });
    }

    resetProxyIndex(){
        this.proxyIndex = 0;
    }    
    getNextProxy(){
        console.log({proxyIndex:this.proxyIndex,proxyPoolLength:this.proxyPool.length});
        const proxy = this.proxyPool[this.proxyIndex];
        this.proxyIndex = (this.proxyIndex + 1) % this.proxyPool.length;
        console.log({
            nextProxyIndex: this.proxyIndex
        });
        return proxy;
    }
    async sendRequestWithProxy(url, config = {}, maxRetries = 5) {
        this.loadProxies(); // Reload proxies from file
    
        let attempts = 0;
    
        while (attempts < maxRetries) {
            const nextProxy = this.getNextProxy();
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
    }
}










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


module.exports.ProxyRotator = ProxyRotator;
