"use-strict";

const { RestClientV5 } = require("bybit-api");

//@ts-check



module.exports.Bybit_RestClientV5 = class Bybit_RestClientV5 {

    /**
     * @type {RestClientV5}
     */
    #restClientV5;
    /**
     * 
     * @param {{restClientV5:RestClientV5}} settings 
     */
    constructor({restClientV5}){
        this.#restClientV5 = restClientV5;
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
            console.log("[method: openNewPosition]")
            const res = await this.#restClientV5.submitOrder(orderParamsV5);
            console.log({res})
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
            const res = await this.#restClientV5.getPositionInfo(positionInfoParamsV5);
            return res;
        }catch(error){
            throw error;
        }
    }


}
