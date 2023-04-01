"use-strict";
//@ts-check

/**
 * @description Bybit class manages how trades are taken in Bybit
 * : It is important to note that you can't send many request in a second, 
 * : So it is important to cache the request and have a job runner taking the trades .
 */

const {LinearClient, RestClientV5} = require("bybit-api"); 


/**
 * @typedef {{ sendOrders_taskRunnerInterval_duration:number}} Bybit_Settings_Interface
 */

module.exports.Bybit = class Bybit {
 
   /**
     * @description Locks make request is a resquest is running. Makes sure requeste run one after the other.
     */
   #requestIsRunningLock = false;

    /**
     * @constructor

     */
    constructor(){ 
     
    };



    /**
     * 
     * @param {number} ms 
     * @returns {Promise<boolean>}
     */
    async delayAsync(ms){
        console.log("Waiting for a delay of ms:",ms)
        console.log({requestIsRunningLock:this.#requestIsRunningLock})
        return new Promise((resolve,reject)=>{
            const timeout = setTimeout(async ()=>{
              console.log({requestIsRunningLock:this.#requestIsRunningLock})
                if(this.#requestIsRunningLock===false){
                  console.log("Delay end:s")
                    clearTimeout(timeout);
                    resolve(true)
                }else {
                    this.#requestIsRunningLock = false;
                    console.log("Reecursive",{requestIsRunningLock:this.#requestIsRunningLock})
                    await this.delayAsync(ms)
                }
            },ms)
        })
    }


    set_requestIsRunningLock(){
        if(this.#requestIsRunningLock){
          this.#requestIsRunningLock = false;
        }else {
          this.#requestIsRunningLock = true;
        }
    }
    remove_requestIsRunningLock(){
        this.#requestIsRunningLock = false;
    }

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
    calculateQty_ForOrder({qty, minQty, stepSize}) {
      try{
        console.log("[method: calculateQty_ForOrder]",{qty, minQty, stepSize})
        const maxQty = Math.floor(qty / stepSize) * stepSize;
        return maxQty >= minQty ? maxQty : 0;

      }catch(error){
        throw error;
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
    
    if (leverage === '') {
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
      
      
  
  
  
  


}