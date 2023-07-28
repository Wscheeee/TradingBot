"use-strict";
//@ts-check

/**
 * @description Bybit class manages how trades are taken in Bybit
 * : It is important to note that you can't send many request in a second, 
 * : So it is important to cache the request and have a job runner taking the trades .
 */

const {WebsocketClient} = require("bybit-api");
const {Bybit_LinearClient} = require("./Bybit_LinearClient");
const {Bybit_RestClientV5} = require("./Bybit_RestClientV5");
const {Bybit_AccountAssetClientV3} = require("./Bybit_AccountAssetClientV3");

const {DecimalMath} = require("../../Math/DecimalMath");

/**
 * @typedef {{ sendOrders_taskRunnerInterval_duration:number}} Bybit_Settings_Interface
 */
/**
 * @typedef {{
 *      bybit_LinearClient: Bybit_LinearClient,
 *      bybit_RestClientV5: Bybit_RestClientV5,
 *      bybit_AccountAssetClientV3: Bybit_AccountAssetClientV3,
 *      websocket_Client: WebsocketClient
 * }} BybitClients_Interface
 */

module.exports.Bybit = class Bybit {
    // CLIENTS
    /**
     * @type {BybitClients_Interface}
     */
    #clients = {};




    // PARAMETERS
    /**
     * @description Locks make request is a resquest is running. Makes sure requeste run one after the other.
     */
    #requestIsRunningLock = false;



    // UTILS
    utils = {
        /**
         * @param {string} subAccountName
         */
        generateRandomUsernameForSubAccount: function generateUsername(subAccountName) {
            let randomDigits = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
            const subAccountNumber = subAccountName.split("_").splice(1,).join("");//Sub_1
            let username = `atomos${randomDigits}a${subAccountNumber}`;
            return username;
        }
    };

    // CONSTS/ENUMS
    // SUB_ACCOUNTS_STATUS = {
    //     1: "normal",
    //     2: "login banned",
    //     4: "frozen"
    // };
    SUB_ACCOUNTS_STATUS = {
        "NORMAL": 1,
        "LOGIN_BANNED": 2,
        "FROZEN": 4
    };
    SUB_ACCOUNTS_MEMBER_TYPES = {
        "NORMAL_SUB_ACCOUNT":1,
        "CUSTODIAL_SUB_ACCOUNT":6
    };
    /**
     * @type {{
     *      TURN_OFF_QUICK_LOGIN_default: 0 |1,
     *      TURN_ON_QUICK_LOGIN: 0 |1
     * }}
     */
    SUB_ACCOUNT_SWITCH = {
        "TURN_OFF_QUICK_LOGIN_default": 0,
        "TURN_ON_QUICK_LOGIN": 1
    };
    API_KEYS_READ_ONLY_MODES = {
        "READ_AND_WRITE":0,
        "READ_ONLY":1
    };


    /**
     * @constructor
     * @param {{millisecondsToDelayBetweenRequests:number,publicKey:string,privateKey:string,testnet:boolean}} settings 
     */
    constructor({millisecondsToDelayBetweenRequests,privateKey,publicKey,testnet}){ 
        this.#clients.bybit_LinearClient = new Bybit_LinearClient({
            linearClient: Bybit_LinearClient.createLinearClient({
                privateKey,publicKey,testnet
            }),
            millisecondsToDelayBetweenRequests
        });

        this.#clients.bybit_RestClientV5 = new Bybit_RestClientV5({
            restClientV5: Bybit_RestClientV5.createRestClientV5({
                privateKey,publicKey,testnet
            }),
            millisecondsToDelayBetweenRequests,
            bybit:this
        });

        this.#clients.bybit_AccountAssetClientV3 = new Bybit_AccountAssetClientV3({
            accountAssetClientV3: Bybit_AccountAssetClientV3.createAccountAssetClientV3({
                privateKey,publicKey,testnet
            }),
            millisecondsToDelayBetweenRequests
        });
        this.#clients.websocket_Client = new WebsocketClient({
            market:"linear",
            secret: privateKey,
            key: publicKey,
            testnet,  

        });
      
    }

    // GETTERS
    get clients(){ return this.#clients;}

    createNewBybitSubClass(){ return Bybit;}
    

    // Websocket Listerners
    async setUpWebsocketListeners(){
        await this.#clients.websocket_Client.connectPrivate();
        this.#clients.websocket_Client.subscribeV5(["position","order","execution"]);
        // Listen to events coming from websockets. This is the primary data source
        this.#clients.websocket_Client.on("update", (data) => {
            console.log("update", data);
        });
  
        // Optional: Listen to websocket connection open event (automatic after subscribing to one or more topics)
        this.#clients.websocket_Client.on("open", ({ wsKey, event }) => {
            console.log("connection open for websocket with ID: " + wsKey);
        });
  
        // Optional: Listen to responses to websocket queries (e.g. the response after subscribing to a topic)
        this.#clients.websocket_Client.on("response", (response) => {
            console.log("response", response);
        });
  
        // Optional: Listen to connection close event. Unexpected connection closes are automatically reconnected.
        this.#clients.websocket_Client.on("close", () => {
            console.log("connection closed");
        });
  
        // Optional: Listen to raw error events. Recommended.
        this.#clients.websocket_Client.on("error", (err) => {
            console.error("error", err);
        });
    }


    /**
     * Calculates the maximum quantity that can be sold based on the minimum quantity and step size of a cryptocurrency symbol.
     *
     * @param {{qty:number,minQty:number,stepSize:number, maxQty:number}} params
     *  - The quantity that needs to be sold or bought.
     *  - The minimum quantity that can be sold or bought.
     *  - The quantity increment for selling or buying.
     // * @returns {number[]} The maximum quantity that can be sold.
     *
    */
    #calculateQty_ForOrder({qty, minQty, stepSize, maxQty}) {
        // retuurn array off qty'sso as to handle cases where qty is too big over max and need to execute full qty but iin batches
        console.log("[method: calculateQty_ForOrder]",{qty, minQty, stepSize, maxQty});
        /**
         * @type {number[]}
         */
        let quantitiesArray = [];

        if (qty <= maxQty) {
            quantitiesArray.push(qty);
        } else {
            // qty > maxqty
            const numRequests = Math.floor(qty / maxQty);
            const remainder = qty % maxQty;
        
            /**
             * @type {number[]}
             */
            let arrayWithQuantitiesLeftToExecute = new Array(numRequests).fill(0).map(_ => maxQty);


            if (remainder > 0) {
                arrayWithQuantitiesLeftToExecute.push(remainder);
            }

            quantitiesArray = [...quantitiesArray,...arrayWithQuantitiesLeftToExecute];
        }

        /// standardize the qty in arrayWithQuantitiesLeftToExecute
        return quantitiesArray.map((unstandardizedQty)=>{
            const maxQty = new DecimalMath(Math.floor(new DecimalMath(unstandardizedQty).divide(stepSize).getResult())).multiply(stepSize).getResult();
            return maxQty >= minQty ? maxQty : 0;
        });

    }  

    /**
     * 
     * @param {{symbol:string,quantity:number,isRetry?:boolean}} param0 
     * @return {number[]}
     */
    async standardizeQuantity({quantity,symbol,isRetry}){
        console.log("[method: standardizeQuantity]");
        console.log({quantity,symbol});
        const symbolInfo = await this.#clients.bybit_LinearClient.getSymbolInfo(symbol);
        console.log({symbolInfo});
        if(!symbolInfo || !symbolInfo.name){
            if(isRetry){
                throw symbolInfo;

            }
            return await this.standardizeQuantity({quantity,symbol,isRetry:true});
        }else {
            const minQty = symbolInfo.lot_size_filter.min_trading_qty;
            const qtyStep = symbolInfo.lot_size_filter.qty_step;
            const quantities =  this.#calculateQty_ForOrder({
                qty: quantity,
                minQty:minQty,
                stepSize:qtyStep,
                maxQty: symbolInfo.lot_size_filter.max_trading_qty
            });
            
            return quantities;
        }
    }

    /**
     * Convert a given price to its standardized form based on the price filter.
     *
     * @param {{
     *      price: number,
     *      symbol: string
     * }} param0
     */
    async standardizedPrice({price, symbol}) {
        console.log("[method: standardizedPrice]");
        const symbolInfo = await this.#clients.bybit_LinearClient.getSymbolInfo(symbol);
        console.log({symbolInfo});
        if(!symbolInfo || !symbolInfo.name){
            throw symbolInfo;
        }
        const priceFilter = symbolInfo.price_filter;
        /**
         * Helper function to get the number of decimal places in a number.
         * @param {number} num - The input number.
         * @returns {number} - The number of decimal places in the input number.
         */
        function getDecimalPlaces(num) {
            if (!isFinite(num)) {
                return 0;
            }
            let e = 1;
            let p = 0;
            while (Math.round(num * e) / e !== num) {
                e *= 10;
                p++;
            }
            return p;
        }
        const tickSize = parseFloat(priceFilter.tick_size);

        // Convert the input price to a numeric value
        const numericPrice = price;
        if (isNaN(numericPrice)) {
            throw new Error("Invalid price: not a number.");
        }

        // Calculate the standardized price
        const standardizedPrice = (Math.round(numericPrice / tickSize) * tickSize).toFixed(getDecimalPlaces(tickSize));

        return parseFloat(standardizedPrice);
    }
  
  
  
    //   // Example usage:
    //   const priceFilter = {
    //     tick_size: '0.001',
    //   };
  
    //   const inputPrice = '0.7253358975';
    //   const standardizedPrice = getStandardizedPrice(inputPrice, priceFilter);
    //   console.log(standardizedPrice); // Output: '0.725'
  


    


    // MATHS
    /**
    * @param {import("bybit-api").PositionV5} position 
    * @returns {number}
    */
    calculatePositionROI(position) {
        const currentValue = parseFloat(position.positionValue);
        const positionSize = parseFloat(position.size);
        const averageEntryPrice = parseFloat(position.avgPrice);
  
        const initialCost = (positionSize * averageEntryPrice)/position.leverage;
        const roi = (currentValue - initialCost) / initialCost;
  
        return roi;
    }
   
    // * @param {import("bybit-api").AccountOrderV5} position 
    /**
      * @param {import("bybit-api").ClosedPnLV5} closedPnLV5 
      * @returns {number}
      */
    calculateClosedPositionROI_fromclosedPnLV5(closedPnLV5) {
        const currentValue = parseFloat(closedPnLV5.cumExitValue);
        const positionSize = parseFloat(closedPnLV5.qty);
        const averageEntryPrice = parseFloat(closedPnLV5.avgEntryPrice);

        const initialCost = positionSize * averageEntryPrice;
        const roi = (currentValue - initialCost) / initialCost;

        return roi;
    }
    /**
      * @param {{
      *     positionCurrentValue: number,
      *     positionSize: number,
      *     averageEntryPrice: Number
      * }} param 
      * @returns {number}
      */
    calculateClosedPositionROI({averageEntryPrice,positionCurrentValue,positionSize}) {
        const currentValue = positionCurrentValue;

        const initialCost = positionSize * averageEntryPrice;
        const roi = (currentValue - initialCost) / initialCost;
        console.log("[Bybit => calculateClosedPositionROI]",{
            averageEntryPrice,positionCurrentValue,positionSize,roi
        });
       
        return roi;
    }
    /**
      * @param {import("bybit-api").AccountOrderV5} accountOrderV5 
      * @returns {number}
      */
    calculateAccountActiveOrderROI(accountOrderV5) {
        const currentValue = parseFloat(accountOrderV5.cumExecValue); 
        const positionSize = parseFloat(accountOrderV5.qty);
        const averageEntryPrice = parseFloat(accountOrderV5.avgPrice);

        const initialCost = positionSize * averageEntryPrice;
        const roi = (currentValue - initialCost) / initialCost;

        return roi;
    }

    /**
    * @param {import("bybit-api").PositionV5} position 
    * @returns {number}
    */
    calculatePositionPNL(position) {
        const currentValue = parseFloat(position.positionValue);
        const averageEntryPrice = parseFloat(position.avgPrice);
        const realizedPNL = parseFloat(position.cumRealisedPnl);
  
        const initialCost = position.size * averageEntryPrice;
        const pnl = (currentValue - initialCost) + realizedPNL;
  
        return pnl;
    }
    
    
    // Active Order
    /**
    * @param {import("bybit-api").AccountOrderV5} accountOrderV5 
    * @returns {number}
    */
    calculateAccountActiveOrderPNL(accountOrderV5) {
        const currentValue = parseFloat(accountOrderV5.cumExecValue);
        const averageEntryPrice = parseFloat(accountOrderV5.avgPrice);
        const realizedPNL = 0;//parseFloat(accountOrderV5.cumRealisedPnl);
  
        const initialCost = accountOrderV5.size * averageEntryPrice;
        const pnl = (currentValue - initialCost) + realizedPNL;
  
        return pnl;
    }


    


    /**
    * @param {import("bybit-api").PositionV5} position 
    * @returns {number}
    */
    getPositionLeverage(position) {
        let leverage = position.leverage;
    
        if (leverage === "") {
            leverage = 0;//'Not available';
        }
    
        return leverage;
    }

    /**
    * @param {import("bybit-api").PositionV5} position 
    * @returns {number}
    */
    getPositionSize(position) {
        return parseFloat(position.size);
    }
  
    /**
    * @param {import("bybit-api").PositionV5} position 
    * @returns {number}
    */
    getPositionEntryPrice(position) {
        return parseFloat(position.avgPrice);
    }
      
    /**
    * @param {import("bybit-api").PositionV5} position 
    * @param {"Spot"|"Linear"} category
    * @returns {number}
    */ 
    getPositionClosePrice(position,category) {
        if(category==="Spot"){
            return parseFloat(position.markPrice);
        }else if(category=="Linear"){
            return parseFloat(position.markPrice);
        }else {
            return parseFloat(position.lastPrice);
        }
    }
      
      

  
  
  
  


};