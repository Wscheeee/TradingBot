"use-strict";
//@ts-check

/**
 * @description Bybit class manages how trades are taken in Bybit
 * : It is important to note that you can't send many request in a second, 
 * : So it is important to cache the request and have a job runner taking the trades .
 */


const {Bybit_LinearClient} = require("./Bybit_LinearClient");
const {Bybit_RestClientV5} = require("./Bybit_RestClientV5");
const {Bybit_AccountAssetClientV3} = require("./Bybit_AccountAssetClientV3");

const {DecimalMath} = require("../../DecimalMath/DecimalMath");

/**
 * @typedef {{ sendOrders_taskRunnerInterval_duration:number}} Bybit_Settings_Interface
 */
/**
 * @typedef {{
 *      bybit_LinearClient: Bybit_LinearClient,
 *      bybit_RestClientV5: Bybit_RestClientV5,
 *      bybit_AccountAssetClientV3: Bybit_AccountAssetClientV3
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
            millisecondsToDelayBetweenRequests
        });

        this.#clients.bybit_AccountAssetClientV3 = new Bybit_AccountAssetClientV3({
            accountAssetClientV3: Bybit_AccountAssetClientV3.createAccountAssetClientV3({
                privateKey,publicKey,testnet
            }),
            millisecondsToDelayBetweenRequests
        });
      
    }

    // GETTERS
    get clients(){ return this.#clients;}
    



    /**
     * Calculates the maximum quantity that can be sold based on the minimum quantity and step size of a cryptocurrency symbol.
     *
     * @param {{qty:number,minQty:number,stepSize:number}} params
     *  - The quantity that needs to be sold or bought.
     *  - The minimum quantity that can be sold or bought.
     *  - The quantity increment for selling or buying.
     *
     * @returns {number} The maximum quantity that can be sold.
     */
    #calculateQty_ForOrder({qty, minQty, stepSize}) {
        console.log("[method: calculateQty_ForOrder]",{qty, minQty, stepSize});
        const maxQty = new DecimalMath(Math.floor(new DecimalMath(qty).divide(stepSize).getResult())).multiply(stepSize).getResult();
        return maxQty >= minQty ? maxQty : 0;

    }  

    /**
     * 
     * @param {{symbol:string,quantity:number}} param0 
     */
    async standardizeQuantity({quantity,symbol}){
        console.log("[method: standardizeQuantity]");
        const symbolInfo = await this.#clients.bybit_LinearClient.getSymbolInfo(symbol);
        console.log({symbolInfo});
        if(!symbolInfo || !symbolInfo.name){
            throw symbolInfo;
        }else {
            const minQty = symbolInfo.lot_size_filter.min_trading_qty;
            const qtyStep = symbolInfo.lot_size_filter.qty_step;
            const maxQty =  this.#calculateQty_ForOrder({
                qty: quantity,
                minQty:minQty,
                stepSize:qtyStep
            });
            
            return maxQty;
        }
    }



    


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
            return parseFloat(position.lastPrice);
        }else {
            return parseFloat(position.lastPrice);
        }
    }
      
      

  
  
  
  


};