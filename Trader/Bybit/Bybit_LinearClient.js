"use-strict";
//@ts-check

const { LinearClient } = require("bybit-api");

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
     * 
     * @param {{linearClient:LinearClient}} settings 
     */
    constructor({linearClient}){
        this.#linearClient = linearClient;
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
            const res = await this.#linearClient.getSymbols();
            if(res.result){
                this.#symbols = res.result.map(s => s)
            }
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
            if(this.#symbols.length<1){
                await this.getAllSymbols();
            }
            return this.#symbols.find((s)=> s.name===symbolName)
            
        }catch(error){
            throw error;
        }
    }
}


