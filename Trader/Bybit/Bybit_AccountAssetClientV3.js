"use-strict";

const { AccountAssetClientV3} = require("bybit-api");
const {RateLimiter} = require("../utils/RateLimiter");


module.exports.Bybit_AccountAssetClientV3 = class Bybit_AccountAssetClientV3 {
    // STATIC
    /**
     * @param {{publicKey:string,privateKey:string,testnet:boolean}}
     * @returns {AccountAssetClientV3}
     */
    static  createAccountAssetClientV3({privateKey,publicKey,testnet}){
        const accountAssetClientV3 =  new AccountAssetClientV3({
            key: publicKey,
            secret: privateKey,
            testnet:testnet
        });
        return accountAssetClientV3;
		
    }


    /**
     * @type {RateLimiter}
     */
    #rateLimiter;
    /**
     * @type {AccountAssetClientV3}
     */
    #accountAssetClientV3;

    /**
     * 
     * @param {{accountAssetClientV3:AccountAssetClientV3,millisecondsToDelayBetweenRequests:number}} settings 
     */
    constructor({accountAssetClientV3,millisecondsToDelayBetweenRequests}){
        this.#accountAssetClientV3 = accountAssetClientV3;
        this.#rateLimiter = new RateLimiter({
            delayms: millisecondsToDelayBetweenRequests
        });
    }


    /**
     * 
     * @param {import("bybit-api").SingleAccountCoinBalanceRequestV3} singleAccountCoinBalanceRequestV3 
     */
    async getDerivativesCoinBalance(singleAccountCoinBalanceRequestV3){
        await this.#rateLimiter.addJob();
        const getCoinInformation_Res = await this.#accountAssetClientV3.getAccountCoinBalance(singleAccountCoinBalanceRequestV3);
        return getCoinInformation_Res;
    }


};