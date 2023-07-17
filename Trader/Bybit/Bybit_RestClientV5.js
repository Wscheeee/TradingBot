"use-strict";
//@ts-check
const { RestClientV5} = require("bybit-api");

const {RateLimiter} = require("../utils/RateLimiter");
const {DecimalMath} = require("../../DecimalMath");

module.exports.Bybit_RestClientV5 = class Bybit_RestClientV5  {

    /**
     * @type {import("bybit-api").RestClientV5}
     */
    #restClientV5;

    /**
     * @type {number}
     */
    #millisecondsToDelayBetweenRequests = 0;

    /**
     * @type {RateLimiter}
     */
    #rateLimiter;

    /***
     * @type {import("./Bybit").Bybit}
     */
    #bybit;

    /**
     * 
     * @param {{
     *      restClientV5:import("bybit-api").RestClientV5,millisecondsToDelayBetweenRequests:number,
     *      bybit: import("./Bybit").Bybit
     * }} settings 
     */
    constructor({restClientV5,millisecondsToDelayBetweenRequests,bybit}){
        this.#restClientV5 = restClientV5;
        this.#millisecondsToDelayBetweenRequests = millisecondsToDelayBetweenRequests;
        this.#rateLimiter = new RateLimiter({
            delayms: millisecondsToDelayBetweenRequests
        });
        this.#bybit = bybit;
    }

    // STATIC
    /**
     * @param {{publicKey:string,privateKey:string,testnet:boolean}}
     * @returns {RestClientV5}
     */
    static  createRestClientV5({privateKey,publicKey,testnet}){
        const client =  new RestClientV5({
            key: publicKey,
            secret: privateKey,
            testnet:testnet
        });
        return client;
    }

    /**
     * Query the margin mode and the upgraded status of account
     */
    async getAccountInfo(){
        await this.#rateLimiter.addJob();
        console.log("[method: getAccountInfo]");
        const res = await this.#restClientV5.getAccountInfo();
        return res;
    }

    // public
    // /**
    //  * 
    //  * @param {{
    //  *      orderParams: import("bybit-api").OrderParamsV5,
    //  *      symbolMaxLotSize: number,
    //  *      symbolLotStepSize: number
    //  * }} orderParamsV5 
    //  */
    // async openANewPosition({orderParams,symbolLotStepSize,symbolMaxLotSize}){
    //     await this.#rateLimiter.addJob();
    //     console.log("[method: openNewPosition]");        
    //     console.log({orderParams,symbolLotStepSize,symbolMaxLotSize});
    //     const res = await this.#restClientV5.submitOrder(orderParams);
    //     return res;
    // }

    /**
     * 
     * @param {{
    *      orderParams: import("bybit-api").OrderParamsV5,
    *      symbolMaxLotSize?: number,
    *      symbolLotStepSize?: number
    * }} orderParamsV5 
    */
    async openANewPosition({ orderParams, symbolLotStepSize, symbolMaxLotSize }) {
        const FUNCTION_NAME = "[method: openANewPosition]";
        await this.#rateLimiter.addJob();
        console.log(FUNCTION_NAME);
        console.log({ orderParams, symbolLotStepSize, symbolMaxLotSize });
        if(!symbolLotStepSize|!symbolMaxLotSize){
            const standardized_qty = await this.#bybit.standardizeQuantity({quantity:orderParams.qty,symbol:orderParams.symbol});
            const requestParams = { ...orderParams, qty: String(standardized_qty[0] ) };
            // exeutte the request as is
            const openPositionRes = await this.#restClientV5.submitOrder(requestParams);
            return {openPositionsRes:[{
                response: openPositionRes,
                executed_quantity:  parseFloat(orderParams.qty)
            }]};
        }
        /**
         * @type {number[]}
         */
        if (parseFloat(orderParams.qty) <= symbolMaxLotSize) {
            console.log(`${FUNCTION_NAME} [orderParams.qty <= symbolMaxLotSize] this.#restClientV5.submitOrder(orderParams) :orderParams ` ,);
            console.log({orderParams});
            const standardized_qty = await this.#bybit.standardizeQuantity({quantity:orderParams.qty,symbol:orderParams.symbol});
            const requestParams = { ...orderParams, qty: String(standardized_qty[0] ) };
            // exeutte the request as is
            const openPositionRes = await this.#restClientV5.submitOrder(requestParams);
            return {openPositionsRes:[{
                response: openPositionRes,
                executed_quantity:  parseFloat(orderParams.qty)
            }]};
        } else {
            console.log(`${FUNCTION_NAME} [orderParams.qty > symbolMaxLotSize] this.#restClientV5.submitOrder(orderParams) :orderParams ` ,);
            const numRequests = Math.floor(parseFloat(orderParams.qty) / symbolMaxLotSize);
            const remainder = orderParams.qty % symbolMaxLotSize;
        
            /**
             * @type {number[]}
             */
            let arrayWithQuantitiesLeftToExecute = new Array(numRequests).fill(0).map(_ => symbolMaxLotSize);


            if (remainder > 0) {
                arrayWithQuantitiesLeftToExecute.push(remainder);
            }

            const openPositionsRes = [];
            for(const qtyToExecute of arrayWithQuantitiesLeftToExecute){
                const standardized_qty = await this.#bybit.standardizeQuantity({quantity:qtyToExecute,symbol:orderParams.symbol});
                const requestParams = { ...orderParams, qty: String(standardized_qty[0] ) };
                const openPositionRes = await this.#restClientV5.submitOrder(requestParams);
                openPositionsRes.push({
                    response: openPositionRes,
                    executed_quantity: qtyToExecute
                });

            }
         
            return {openPositionsRes};
        }
    }


    /**
     * @param {import("bybit-api").CancelOrderParamsV5} cancelOrderParamsV5
     */
    async cancelAnOrder(cancelOrderParamsV5){
        const cancelOrderRes = await this.#restClientV5.cancelOrder(cancelOrderParamsV5);
        return cancelOrderRes;
    }

    // /**
    //  * 
    //  * @param {{
    //  *      orderParams: import("bybit-api").OrderParamsV5,
    //  *      symbolMaxLotSize: number,
    //  *      symbolLotStepSize: number
    //  * }} orderParamsV5 
    //  */
    // async closeAPosition(orderParamsV5){
    //     await this.#rateLimiter.addJob();
    //     console.log("[method: closeAPosition]");        
    //     console.log(orderParamsV5);
    //     const res = await this.#restClientV5.submitOrder(orderParamsV5);        
    //     return res;
    // }

    /**
     * Eecute onlyy one qty are returns the other remaining qty to execute
     * @param {{
    *      orderParams: import("bybit-api").OrderParamsV5,
    *      symbolMaxLotSize?: number,
    *      symbolLotStepSize?: number
    * }} orderParamsV5 
    */
    async closeAPosition({orderParams, symbolLotStepSize, symbolMaxLotSize}) {
        const FUNCTION_NAME = "[method: closeAPosition]";
        await this.#rateLimiter.addJob();
        console.log(FUNCTION_NAME);
   
        console.log({ orderParams, symbolLotStepSize, symbolMaxLotSize });
        if(!symbolLotStepSize||!symbolMaxLotSize){
            const standardized_qty = await this.#bybit.standardizeQuantity({quantity:orderParams.qty,symbol:orderParams.symbol});
            const requestParams = { ...orderParams, qty: String(standardized_qty[0] ) };
            const closePositionRes = await this.#restClientV5.submitOrder(requestParams);
            return {closePositionsRes:[{
                response: closePositionRes,
                executed_quantity: parseFloat(orderParams.qty)
            }]};
        } 
        /**
         * @type {number[]}
         */
        if (parseFloat(orderParams.qty) <= symbolMaxLotSize) {
            const standardized_qty = await this.#bybit.standardizeQuantity({quantity:orderParams.qty,symbol:orderParams.symbol});
            const requestParams = { ...orderParams, qty: String(standardized_qty[0] ) };
            const closePositionRes = await this.#restClientV5.submitOrder(requestParams);
            return {closePositionsRes:[{
                response: closePositionRes,
                executed_quantity: parseFloat(orderParams.qty)
            }]};
        } else {
            const numRequests = Math.floor(parseFloat(orderParams.qty) / symbolMaxLotSize);
            const remainder = orderParams.qty % symbolMaxLotSize;
            
            /**
             * @type {number[]}
             */
            let arrayWithQuantitiesLeftToExecute = new Array(numRequests).fill(0).map(_ => symbolMaxLotSize);


            if (remainder > 0) {
                arrayWithQuantitiesLeftToExecute.push(remainder);
            }
            const closePositionsRes = [];
            for(const qtyToExecute of arrayWithQuantitiesLeftToExecute){
                // const requestParams = { ...orderParams, qty: String(qtyToExecute) };
                const standardized_qty = await this.#bybit.standardizeQuantity({quantity:qtyToExecute,symbol:orderParams.symbol});
                const requestParams = { ...orderParams, qty: String(standardized_qty[0] ) };
                const closePositionRes = await this.#restClientV5.submitOrder(requestParams);
                closePositionsRes.push({
                    response: closePositionRes,
                    executed_quantity: qtyToExecute
                });

            }
         
            return {closePositionsRes};
            
        }
    }
   

    /**
     * 
     * @param {import("bybit-api").AmendOrderParamsV5} amendOrderParamsV5 
     */
    async updateAPosition(amendOrderParamsV5){
        await this.#rateLimiter.addJob();
        console.log("[method: updateAPosition]");        
        console.log(amendOrderParamsV5);
        const res = await this.#restClientV5.amendOrder(amendOrderParamsV5);        
        return res;
    }


    /**
     * 
     * @param {import("bybit-api").PositionInfoParamsV5} positionInfoParamsV5 
    */
    // * @returns {Promise<import("bybit-api").APIResponseV3WithTime<import("bybit-api").CategoryCursorListV5<import("bybit-api").PositionV5[], import("bybit-api").CategoryV5>>>}
    async getPositionInfo_Realtime(positionInfoParamsV5){
        await this.#rateLimiter.addJob();
        console.log("[method: getPositionInfo_Realtime]");        
        console.log(positionInfoParamsV5);
        const res = await this.#restClientV5.getPositionInfo(positionInfoParamsV5);
        return res;
    }

    /**
     * @param {import("bybit-api").GetAccountOrdersParams} getAccountOrdersParams
     */
    async getActiveOrders(getAccountOrdersParams){
        await this.#rateLimiter.addJob();
        console.log("[method: getActiveOrders]");
        console.log(getAccountOrdersParams);
        return await this.#restClientV5.getActiveOrders(getAccountOrdersParams);
    }

 

    /**
     * @param {import("bybit-api").GetAccountOrdersParams} getAccountOrdersParams 
     */
    async getOrderHistory(getAccountOrdersParams){
        await this.#rateLimiter.addJob();
        console.log("[method: getOrderHistory]");
        return await this.#restClientV5.getHistoricOrders(getAccountOrdersParams);
    }


    // /**
    // * @param {import("bybit-api").GetAccountOrdersParams} positionInfoParamsV5
    // */
    // async getTotalOpenPositionsUSDTValue(positionInfoParamsV5){
    //     await this.#rateLimiter.addJob();
    //     console.log("[method: getTotalOpenPositionsUSDTValue]");
    //     const activeOrders_Res = await this.getPositionInfo_Realtime(positionInfoParamsV5);
    //     if(activeOrders_Res.retCode!==0){
    //         throw new Error(`[method: getTotalOpenPositionsUSDTValue] ${activeOrders_Res.retMsg}`);
    //     }else {
    //         let totalValue = 0;
    //         for(const order of activeOrders_Res.result.list){
    //             const orderValue = order.;
    //             totalValue+= orderValue;
    //         }
    //         return totalValue;
    //     }
    // }

    /**
     * 
     * @param {import("bybit-api").PositionInfoParamsV5} positionsInfoParamsV5 
    */
    async getTotalOpenPositionsUSDTValue(positionsInfoParamsV5){
        await this.#rateLimiter.addJob();
        console.log("[method: getTotalOpenPositionsUSDTValue]");
        const openPositions_Res = await this.getPositionInfo_Realtime(positionsInfoParamsV5);
        if(openPositions_Res.retCode!==0){
            throw new Error(`[method: getTotalOpenPositionsUSDTValue] ${openPositions_Res.retMsg}`);
        }else {
            let totalValue = 0;
            for(const position of openPositions_Res.result.list){
                const positionValue = new DecimalMath(parseFloat(position.positionValue)).divide(parseFloat(position.leverage||1)).getResult();
                totalValue+= positionValue;
            }
            return totalValue;
        }
    }


    // Account



    /**
     * 
     * @param {import('bybit-api').GetWalletBalanceParamsV5} params 
     */
    async getWalletBalance(params){
        await this.#rateLimiter.addJob();
        console.log("[method: getWalletBalance]");
        const res =  await this.#restClientV5.getWalletBalance(params);
        return res;
    }
    /**
     * 
     * @param {import('bybit-api').GetAllCoinsBalanceParamsV5} params 
     */
    async getAllCoinsBalance(params){
        await this.#rateLimiter.addJob();
        console.log("[method: getAllCoinsBalance]");
        const res =  await this.#restClientV5.getAllCoinsBalance(params);
        return res;
    }


    /**
     * 
     * @param {import("bybit-api").GetAccountOrdersParams} getAccountOrdersParams 
     */
    async getClosedPositionInfo(getAccountOrdersParams){
        await this.#rateLimiter.addJob();
        // await this.#rateLimiter.addJob();
        console.log("[method: getClosedPositionInfo]");
        const res = await this.#restClientV5.getHistoricOrders(getAccountOrdersParams);
        return res;
    }


    /**
     * 
     * @param {import("bybit-api").GetClosedPnLParamsV5} getClosedPnLParamsV5 
     */
    async getClosedPositionPNL(getClosedPnLParamsV5){
        await this.#rateLimiter.addJob();
        // await this.#rateLimiter.addJob();
        console.log("[method: getClosedPositionInfo]");
        const res = await this.#restClientV5.getClosedPnL(getClosedPnLParamsV5);
        return res;
    }

    /**
     * 
     * @param {import("bybit-api").CreateSubMemberParamsV5} createSubMemberParamsV5
     */
    async createSubAccount(createSubMemberParamsV5){
        await this.#rateLimiter.addJob();
        console.log("[method: createSubAccount]");
        console.log(createSubMemberParamsV5);
        const res = await this.#restClientV5.createSubMember(createSubMemberParamsV5);
        return res;
    }
    

    /**
     * This endpoint allows you to get a list of all sub UID of master account
     */
    async getSubUIDList(){
        await this.#rateLimiter.addJob();
        console.log("[method: getSubUIDList]");
        const res = await this.#restClientV5.getSubUIDList(); 
        return res;
    }


    /***
     * @param {import("bybit-api").CreateSubApiKeyParamsV5} createSubApiKeyParamsV5
     */
    async createSubAccountUIDAPIKey(createSubApiKeyParamsV5){
        await this.#rateLimiter.addJob();
        console.log("[method: createSubAccountAPIKKey]");
        console.log(createSubApiKeyParamsV5);
        const res = await this.#restClientV5.createSubUIDAPIKey(createSubApiKeyParamsV5);
        return res;
    }

    /**
     * It is a one-time switch which, once thrown, enables a subaccount permanently. If not set, your subaccount cannot use universal transfers.
     * @param {string[]} subMemberIds
     */
    async enableUniversalTransferForSubAccountsWithUIDs(subMemberIds){
        await this.#rateLimiter.addJob();
        console.log("[method: enableUniversalTransferForUID]");
        const res = await this.#restClientV5.enableUniversalTransferForSubUIDs(subMemberIds);
        return res;
    }

    async deleteSubApiKey(){
        await this.#rateLimiter.addJob();
        console.log("[method: deleteSubApiKey]");
        const res = await this.#restClientV5.deleteSubApiKey();
        return res;
    }

    // async updateAPiKeyPermissions(){
    //     await this.#rateLimiter.addJob();
    //     console.log("[method: updateAPiKeyPermissions]");
    //     const res = await this.#restClientV5.();
    //     return res;
    // }
    /**
     * 
     * @param {import("bybit-api").UniversalTransferParamsV5} universalTransferParamsV5
     */
    async createUniversalTransfer(universalTransferParamsV5){
        await this.#rateLimiter.addJob();
        console.log("[method: createUniversalTransfer]");
        console.log(universalTransferParamsV5);
        const res = await this.#restClientV5.createUniversalTransfer(universalTransferParamsV5);
        return res;
    }


    


 



    
   


    
};
