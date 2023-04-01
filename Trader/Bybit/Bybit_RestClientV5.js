"use-strict";
//@ts-check

const { RestClientV5 } = require("bybit-api");
const { Bybit } = require("./Bybit")



module.exports.Bybit_RestClientV5 = class Bybit_RestClientV5 extends Bybit{

    /**
     * @type {RestClientV5}
     */
    #restClientV5;

    /**
     * @type {number}
     */
    #millisecondsToDelayBetweenRequests = 0;
    /**
     * 
     * @param {{restClientV5:RestClientV5,millisecondsToDelayBetweenRequests:number}} settings 
     */
    constructor({restClientV5,millisecondsToDelayBetweenRequests}){
        super();
        this.#restClientV5 = restClientV5;
        this.#millisecondsToDelayBetweenRequests = millisecondsToDelayBetweenRequests;
    };

    // STATIC
    /**
     * @param {{publicKey:string,privateKey:string,testnet:boolean}}
     * @returns {RestClientV5}
     */
    static  createRestClientV5({privateKey,publicKey,testnet}){
        try{
            
            const client =  new RestClientV5({
                key: publicKey,
                secret: privateKey,
                testnet:testnet
            });
             return client;
        }catch(error){
            throw error;
        }
    }

    // public
    /**
     * 
     * @param {import("bybit-api").OrderParamsV5} orderParamsV5 
     */
    async openNewPosition(orderParamsV5){
        try {
            await this.delayAsync(this.#millisecondsToDelayBetweenRequests);
            console.log("[method: openNewPosition]")
            
            console.log(orderParamsV5)
            const res = await this.#restClientV5.submitOrder(orderParamsV5);
            
            // console.log({res})
            return res;
        }catch(error){
            
            throw error;
        }
    }

     /**
     * 
     * @param {import("bybit-api").OrderParamsV5} orderParamsV5 
     */
    async closeAPosition(orderParamsV5){
        try{
            await this.delayAsync(this.#millisecondsToDelayBetweenRequests);
            console.log("[method: closeAPosition]")
            
            console.log(orderParamsV5)
            const res = await this.#restClientV5.submitOrder(orderParamsV5);
            
            return res;
        }catch(error){
            
            throw error;
        }
    }

    /**
     * 
     * @param {import("bybit-api").OrderParamsV5} orderParamsV5 
     */
    async updateAPosition(orderParamsV5){
        try{
            await this.delayAsync(this.#millisecondsToDelayBetweenRequests);
            console.log("[method: updateAPosition]")
            
            console.log(orderParamsV5)
            const res = await this.#restClientV5.submitOrder(orderParamsV5);
            
            return res;
        }catch(error){
            
            throw error;
        }
    }


    /**
     * 
     * @param {import("bybit-api").PositionInfoParamsV5} positionInfoParamsV5 
     */
    async getOpenPositions(positionInfoParamsV5){
        try{
            await this.delayAsync(this.#millisecondsToDelayBetweenRequests);
            console.log("[method: getOpenPosition]")
            
            console.log(positionInfoParamsV5)
            const res = await this.#restClientV5.getPositionInfo(positionInfoParamsV5);
            
            return res;
        }catch(error){
            
            throw error;
        }
    }




    // Account
    /**
     * 
     * @param {import('bybit-api').GetAllCoinsBalanceParamsV5} params 
     */
    async getAllCoinsBalance(params){
        try {
            await this.delayAsync(this.#millisecondsToDelayBetweenRequests);
            
            console.log("[method: getAllCoinsBalance]")
            const res =  await this.#restClientV5.getAllCoinsBalance(params)
            
            return res;
        }catch(error){
            
            throw error;
        }
    }




    
}
