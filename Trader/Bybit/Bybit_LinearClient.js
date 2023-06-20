"use-strict";

const { LinearClient } = require("bybit-api");
const {RateLimiter} = require("../utils/RateLimiter");

module.exports.Bybit_LinearClient = class Bybit_LinearClient {
    /**
     * @type {import("bybit-api").SymbolInfo[]}
     */
    #symbols = [];
    /**
     * @type {LinearClient}
     */
    #linearClient;

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
     * @param {{linearClient:LinearClient,millisecondsToDelayBetweenRequests:number}} settings 
     */
    constructor({linearClient,millisecondsToDelayBetweenRequests}){
        this.#linearClient = linearClient;
        this.#millisecondsToDelayBetweenRequests = millisecondsToDelayBetweenRequests;
        this.#rateLimiter = new RateLimiter({
            delayms: millisecondsToDelayBetweenRequests
        });
    }

    // STATIC
    /**
     * @param {{publicKey:string,privateKey:string,testnet:boolean}}
     * @returns {LinearClient}
     */
    static  createLinearClient({privateKey,publicKey,testnet}){
        const linearClient =  new LinearClient({
            key: publicKey,
            secret: privateKey,
            testnet:testnet
        });
        return linearClient;
    }


    // Public

    async getAllSymbols(){
        console.log("[method: getAllSymbols]");
        // await this.#rateLimiter.delayAsync(this.#millisecondsToDelayBetweenRequests);
        await this.#rateLimiter.addJob();
        const res = await this.#linearClient.getSymbols();
        if(res.result){
            this.#symbols = res.result.map(s => s);
        }
        return res;
    }
    /**
     * @description get te information regarding a certain symbol
     * @param {string} symbolName 
     */
    async getSymbolInfo(symbolName){
        await this.#rateLimiter.addJob();
        console.log("[method: getSymbolInfo]");
        if(this.#symbols.length<1){
            await this.getAllSymbols();
        }
        
        const symbolInfo =  this.#symbols.find((s)=> s.name===symbolName);
        return symbolInfo;
    }


   
 
   
    /****
     * @param {import("bybit-api").LinearSetMarginSwitchRequest} linearSetMarginSwitchRequest
     */
    async switchMargin(linearSetMarginSwitchRequest){
        await this.#rateLimiter.addJob();
        console.log("[method: switchMargin]");
        return await this.#linearClient.setMarginSwitch(linearSetMarginSwitchRequest);
    }

    /**
     * @param {import("bybit-api").LinearSetPositionModeRequest} linearSetPositionModeRequest
     */
    async switchPositionMode(linearSetPositionModeRequest){
        await this.#rateLimiter.addJob();
        console.log("[method: switchPositionMode]");
        return await this.#linearClient.setPositionMode(linearSetPositionModeRequest);
    }

    /** 
     * @param {import("bybit-api").LinearSetUserLeverageRequest} linearSetUserLeverageRequest
     */
    async setUserLeverage(linearSetUserLeverageRequest){
        await this.#rateLimiter.addJob();
        console.log("[method: setUserLeverage]");
        console.log({linearSetUserLeverageRequest});
        return await this.#linearClient.setUserLeverage(linearSetUserLeverageRequest);
    }


    // FORMATTER

    /**
     * 
     * @param {{symbol:string,quantity:number}} param0 
     */
    async standardizeQuantity({quantity,symbol}){
        console.log("[method: standardizeQuantity]");
        await this.#rateLimiter.addJob();
        const symbolInfo = await this.getSymbolInfo(symbol);
        console.log({symbolInfo});
        if(!symbolInfo || !symbolInfo.name){
            throw symbolInfo;
        }else {
            const minQty = symbolInfo.lot_size_filter.min_trading_qty;
            const qtyStep = symbolInfo.lot_size_filter.qty_step;
            const maxQty =  this.calculateQty_ForOrder({
                qty: quantity,
                minQty:minQty,
                stepSize:qtyStep
            });
            
            return maxQty;
        }
    }
};


