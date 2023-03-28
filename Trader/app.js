"use-strict";
//@ts-check
// const { login, } = require("@reiryoku/mida");
const {LinearClient} = require("bybit-api"); 



class Trader {
    /**
     * 
     * @returns {LinearClient}
     */
    static  createLinearClient(){
        try{
            const publicKey = "IOYyiIfygMc1wwPqYz";
            const privateKey = "YoDlMLPvXbLhNUhj7Hr0byyGdz9tkRXhTAyP";
            return new LinearClient({
                key: publicKey,
                secret: privateKey,
                testnet:true
            });
            // const account = await login("Bybit/Futures", { 
            //     apiKey: publicKey,
            //     apiSecret: privateKey
            //  });
             return account;
        }catch(error){
            throw error;
        }

    }
    /**
     * @type {LinearClient}
     */
    #account;
    /**
     * 
     * @param {{account:LinearClient}} param0 
     */
    constructor({
            account
    }){
        this.#account = account;
    };

    /**
     * 
     * @param {import("bybit-api").NewLinearOrder} params 
     */
    async openPosition(params){
        try{
            return this.#account.placeActiveOrder({
                params
            })
        }catch(error){
            throw error;
        }
    }

    /**
     * 
     * @param {import("bybit-api").LinearCancelOrderRequest} params 
     */
    async closePosition(params){
        try {
            return await this.#account.cancelActiveOrder(params)
        }catch(error){
            throw error;
        }
    }


    /**
     * 
     * @param {import("bybit-api").LinearCancelOrderRequest} params 
     */
    async resizePosition(params){
        try {
            return await this.#account.(params)
        }catch(error){
            throw error;
        }
    }




}


(async()=>{
    try{
        const trader = new Trader(Trader.createLinearClient());
        trader.openPosition({

        })
    }catch(e){
        console.log(e)
    }
})()
