"use-strict";

const { RestClientV5} = require("bybit-api");

const {RateLimiter} = require("../utils/RateLimiter");


module.exports.Bybit_RestClientV5 = class Bybit_RestClientV5  {

    /**
     * @type {import("bybit-api").RestClientV5}
     */
    #restClientV5;

    /**
     * @type {number}
     */
    #millisecondsToDelayBetweenRequests = 0;

    /**
     * @type {RateLimiter}
     */
    #rateLimiter;

    /**
     * 
     * @param {{restClientV5:import("bybit-api").RestClientV5,millisecondsToDelayBetweenRequests:number}} settings 
     */
    constructor({restClientV5,millisecondsToDelayBetweenRequests}){
        this.#restClientV5 = restClientV5;
        this.#millisecondsToDelayBetweenRequests = millisecondsToDelayBetweenRequests;
        this.#rateLimiter = new RateLimiter({
            delayms: millisecondsToDelayBetweenRequests
        });
    }

    // STATIC
    /**
     * @param {{publicKey:string,privateKey:string,testnet:boolean}}
     * @returns {RestClientV5}
     */
    static  createRestClientV5({privateKey,publicKey,testnet}){
        const client =  new RestClientV5({
            key: publicKey,
            secret: privateKey,
            testnet:testnet
        });
        return client;
    }

    // public
    /**
     * 
     * @param {import("bybit-api").OrderParamsV5} orderParamsV5 
     */
    async openANewPosition(orderParamsV5){
        await this.#rateLimiter.addJob();
        console.log("[method: openNewPosition]");        
        console.log(orderParamsV5);
        const res = await this.#restClientV5.submitOrder(orderParamsV5);
        return res;
    }


    /**
     * @param {import("bybit-api").CancelOrderParamsV5} cancelOrderParamsV5
     */
    async cancelAnOrder(cancelOrderParamsV5){
        const cancelOrderRes = await this.#restClientV5.cancelOrder(cancelOrderParamsV5);
        return cancelOrderRes;
    }

    /**
     * 
     * @param {import("bybit-api").OrderParamsV5} orderParamsV5 
     */
    async closeAPosition(orderParamsV5){
        await this.#rateLimiter.addJob();
        console.log("[method: closeAPosition]");        
        console.log(orderParamsV5);
        const res = await this.#restClientV5.submitOrder(orderParamsV5);        
        return res;
    }

    /**
     * 
     * @param {import("bybit-api").OrderParamsV5} orderParamsV5 
     */
    async updateAPosition(orderParamsV5){
        await this.#rateLimiter.addJob();
        console.log("[method: updateAPosition]");        
        console.log(orderParamsV5);
        const res = await this.#restClientV5.submitOrder(orderParamsV5);        
        return res;
    }


    /**
     * 
     * @param {import("bybit-api").PositionInfoParamsV5} positionInfoParamsV5 
    */
    // * @returns {Promise<import("bybit-api").APIResponseV3WithTime<import("bybit-api").CategoryCursorListV5<import("bybit-api").PositionV5[], import("bybit-api").CategoryV5>>>}
    async getOpenPositions(positionInfoParamsV5){
        await this.#rateLimiter.addJob();
        console.log("[method: getOpenPosition]");        
        console.log(positionInfoParamsV5);
        const res = await this.#restClientV5.getPositionInfo(positionInfoParamsV5);
        return res;
    }




    // Account
    /**
     * 
     * @param {import('bybit-api').GetAllCoinsBalanceParamsV5} params 
     */
    async getAllCoinsBalance(params){
        await this.#rateLimiter.addJob();
        console.log("[method: getAllCoinsBalance]");
        const res =  await this.#restClientV5.getAllCoinsBalance(params);
        return res;
    }


    /**
     * 
     * @param {import("bybit-api").GetAccountOrdersParams} getAccountOrdersParams 
     */
    async getClosedPositionInfo(getAccountOrdersParams){
        await this.#rateLimiter.addJob();
        console.log("[method: getClosedPositionInfo]");
        const res = await this.#restClientV5.getHistoricOrders(getAccountOrdersParams);
        return res;
    }


    /**
     * 
     * @param {import("bybit-api").GetClosedPnLParamsV5} getClosedPnLParamsV5 
     */
    async getClosedPositionPNL(getClosedPnLParamsV5){
        await this.#rateLimiter.addJob();
        console.log("[method: getClosedPositionInfo]");
        const res = await this.#restClientV5.getClosedPnL(getClosedPnLParamsV5);
        return res;
    }
    


   


    
};
