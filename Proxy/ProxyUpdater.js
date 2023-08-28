const axios = require("axios");
const fs = require("fs");

const {PROXY_FILE_PATH} = require("./constants");
const fetchAndSaveProxies = async () => {
    try {
        const url = "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all";
        const response = await axios.get(url);
        const proxyData = response.data;

        // fs.writeFileSync("files/proxy-list.txt", proxyData);
        console.log({PROXY_FILE_PATH});
        fs.writeFileSync(PROXY_FILE_PATH, proxyData);
        console.log("New proxy list saved.");
    } catch (error) {
        console.error("Failed to fetch and save proxies:", error);
    }

    // Run this function again after 24 hours
    setTimeout(fetchAndSaveProxies, 86400000);
};

// Fetch and save proxies immediately at startup

module.exports.proxyUpdater = async ()=>{
    fetchAndSaveProxies();
};



