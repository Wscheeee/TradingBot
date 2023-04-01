"use-strict";
//@ts-check

const { LinearClient } = require("bybit-api");
const { Bybit } = require("./Bybit")

module.exports.Bybit_LinearClient = class Bybit_LinearClient extends Bybit {
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
     * 
     * @param {{linearClient:LinearClient,millisecondsToDelayBetweenRequests:number}} settings 
     */
    constructor({linearClient,millisecondsToDelayBetweenRequests}){
        super();
        this.#linearClient = linearClient;
        this.#millisecondsToDelayBetweenRequests = millisecondsToDelayBetweenRequests;
    };

    // STATIC
    /**
     * @param {{publicKey:string,privateKey:string,testnet:boolean}}
     * @returns {LinearClient}
     */
    static  createLinearClient({privateKey,publicKey,testnet}){
        try{
            const linearClient =  new LinearClient({
                key: publicKey,
                secret: privateKey,
                testnet:testnet
            });
             return linearClient;
        }catch(error){
            throw error;
        }
    };


    // Public

    async getAllSymbols(){
        try{
            console.log("[method: getAllSymbols]")
           
            await this.delayAsync(this.#millisecondsToDelayBetweenRequests);
            const res = await this.#linearClient.getSymbols();
            if(res.result){
                this.#symbols = res.result.map(s => s);
            }
            
            return res;
        }catch(error){
            
            throw error;
        }
    }
    /**
     * @description get te information regarding a certain symbol
     * @param {string} symbolName 
     */
    async getSymbolInfo(symbolName){
        try{
            await this.delayAsync(this.#millisecondsToDelayBetweenRequests);
            console.log("[method: getSymbolInfo]")     
            if(this.#symbols.length<1){
                await this.getAllSymbols();
            }
            
            const symbolInfo =  this.#symbols.find((s)=> s.name===symbolName)
            return symbolInfo;
            
        }catch(error){
            
            throw error;
        }
    }



    // FORMATTER

    /**
     * 
     * @param {{symbol:string,quantity:number}} param0 
     */
    async formatSellQuantity({quantity,symbol}){
        try{
            console.log("[method: formatSellQuantity]")
            await this.delayAsync(this.#millisecondsToDelayBetweenRequests);
            const symbolInfo = await this.getSymbolInfo(symbol)
            console.log({symbolInfo})
            if(!symbolInfo || !symbolInfo.name){
                throw symbolInfo
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
        }catch(error){
            throw error;
        }
    }
}


