const {proxyUpdater} = require("./ProxyUpdater");
const {sendRequestWithProxy,getNextProxy,loadProxies} = require("./proxyRotator");


module.exports = {
    proxyUpdater,sendRequestWithProxy,getNextProxy,loadProxies
};