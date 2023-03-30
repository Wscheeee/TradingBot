"use-strict";
//@ts-check
// const { login, } = require("@reiryoku/mida");
const {LinearClient, RestClientV5} = require("bybit-api"); 



class Bybit {
    /**
     * @param {{publicKey:string,privateKey:string,testnet:boolean}}
     * @returns {LinearClient}
     */
    static  createLinearClient({privateKey,publicKey,testnet}){
        try{
            const client =  new LinearClient({
                key: publicKey,
                secret: privateKey,
                testnet:testnet
            });
            // console.log({client})
             return client;
        }catch(error){
            throw error;
        }
    }
    
    constructor({     
    }){ 
    };




}