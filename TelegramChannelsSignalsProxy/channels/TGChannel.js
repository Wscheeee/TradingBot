//@ts-check


module.exports.TGChannel = class TGChannel {
    /**
     * @type {string}
     */
    #name = "";
    /**
     * @type {string}
     */
    #username = "";
    /**
     * @type {string}
     */
    #link = "";
    /**
     * @type {number|0}
     */
    #id=0;
    constructor(){

    }

    /**
     * @param {string} n
     */
    set name(n){
        if(this.#name==="")this.#name = n;
    }

    get name(){
        return this.#name;
    }
    /**
     * @param {string} n
     */
    set username(n){
        if(this.#username==="")this.#username = n;
    }

    get username(){
        return this.#username;
    }

    /**
     * @param {string} n
     */
    set link(n){
        if(this.#link==="")this.#link = n;
    }

    get link(){
        return this.#link;
    }

    /**
     * @param {number} n
     */
    set id(n){
        if(this.#id===0)this.#id = n;
    }
    get id(){
        return this.#id;
    }

    /**
     * 
     * @param {string} message 
     * @returns {import("../types").Signal_Interface}
     */
    decodeTradeSignalMessage(message){
        const FUNCTION_NAME = "(fn:decodeTradeSignalMessage)";

        console.log(FUNCTION_NAME+" "+message);
        return {
            direction:"LONG",
            SL:0,
            symbol:"",
            TPs:[]
        };
    }
};


