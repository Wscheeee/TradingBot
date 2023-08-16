"use-strict";
//@ts-check
const { RestClientV5} = require("bybit-api");

const {RateLimiter} = require("../utils/RateLimiter");
const {DecimalMath} = require("../../Math");
const {bottleneck} = require("./bottleneck");


module.exports.Bybit_RestClientV5 = class Bybit_RestClientV5  {

    /**
     * @type {import("bybit-api").RestClientV5}
     */
    #restClientV5;
    /**
     * @type {import("bybit-api").LinearInverseInstrumentInfoV5[]}
     */
    #symbols = [];

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



    async getAllSymbols(){
        console.log("[method: getAllSymbols]");
        // await this.#rateLimiter.delayAsync(this.#millisecondsToDelayBetweenRequests);
        // await this.#rateLimiter.addJob();]]
        /**
         * 
         * @param {string|undefined} nextPageCursor 
         */
        const getLinearSymbols = async (nextPageCursor)=>{
            const res = await bottleneck.schedule(()=> this.#restClientV5.getInstrumentsInfo({
                category:"linear",
                cursor:nextPageCursor
            }));
            if(res.retCode!==0)throw new Error(`"[method: getAllSymbols] restClientV5.getInstrumentsInfo res: ${res.retMsg}`);
            if(res.result){
                /**
                 * @type {import("bybit-api").LinearInverseInstrumentInfoV5[]}
                 */
                this.#symbols = res.result.list.map(s => s);
            }
            if(res.result.nextPageCursor){
                await getLinearSymbols(res.result.nextPageCursor);
            }

        };
        await getLinearSymbols();

        return;
    }

    /**
     * @description get te information regarding a certain symbol
     * @param {string} symbolName 
     */
    async getSymbolInfo(symbolName){
        // await this.#rateLimiter.addJob();
        console.log("[method: getSymbolInfo]");
        
        let symbolInfo =  this.#symbols.find((s)=> s.symbol===symbolName);
        if(!symbolInfo){
            await this.getAllSymbols();
            symbolInfo =  this.#symbols.find((s)=> s.symbol===symbolName);
            if(!symbolInfo)throw new Error(`Symbol:${symbolName} info not found on bybit`);
        }
        return symbolInfo;
    }

    /**
     * 
     * @param {{symbol:string,quantity:number}} param0 
     */
    async standardizeQuantity({quantity,symbol}){
        console.log("[method: standardizeQuantity]");
        // await this.#rateLimiter.addJob();
        const symbolInfo = await this.getSymbolInfo(symbol);
        console.log({symbolInfo,symbol});
        if(!symbolInfo || !symbolInfo.symbol){
            throw new Error("getSymbolInfo res: symbolInfo not found for symbol:"+symbol);
        }else {
            const minQty = parseFloat(symbolInfo.lotSizeFilter.minOrderQty);
            const qtyStep = parseFloat(symbolInfo.lotSizeFilter.qtyStep);
            const maxQty =  this.calculateQty_ForOrder({
                qty: quantity,
                minQty:minQty,
                stepSize:qtyStep
            });
            
            return maxQty;
        } 
    }

   
 
   
    // /****
    //  * @param {import("bybit-api").LinearSetMarginSwitchRequest} linearSetMarginSwitchRequest
    //  */
    // async switchMargin(linearSetMarginSwitchRequest){
    //     // await this.#rateLimiter.addJob();
    //     console.log("[method: switchMargin]");
    //     return await bottleneck.schedule(()=> this.#restClientV5.swi(linearSetMarginSwitchRequest));
    // }

    /**
     * @param {import("bybit-api").AccountMarginModeV5} accountMarginModeV5
     */
    async setMarginMode(accountMarginModeV5){
        return await bottleneck.schedule(()=> {
            console.log("[method: setMarginMode]");
            return this.#restClientV5.setMarginMode(accountMarginModeV5)
        });
    }
    // /**
    //  * @param {import("bybit-api").AccountMarginModeV5} accountMarginModeV5
    //  */
    // async setMarginMode(accountMarginModeV5){
    //     // await this.#rateLimiter.addJob();
    //     console.log("[method: setMarginMode]");
    //     return await bottleneck.schedule(()=> this.#restClientV5.setMarginMode({

    //     }));
    // }
    /**
     * @param {import("bybit-api").SwitchPositionModeParamsV5} switchPositionModeParamsV5
     */
    async switchPositionMode(switchPositionModeParamsV5){
        // await this.#rateLimiter.addJob();
        console.log("[method: switchPositionMode]");
        return await bottleneck.schedule(()=> this.#restClientV5.switchPositionMode(switchPositionModeParamsV5));
    }

    /** 
     * @param {import("bybit-api").SetLeverageParamsV5} setLeverageParamsV5
     */
    async setUserLeverage(setLeverageParamsV5){
        // await this.#rateLimiter.addJob();
        console.log("[method: setUserLeverage]");
        console.log({setLeverageParamsV5});
        return await bottleneck.schedule(()=> this.#restClientV5.setLeverage(setLeverageParamsV5));
    }

    ////////////

    /**
     * Query the margin mode and the upgraded status of account
     */ 
    async getAccountInfo(){
        
        // await this.#rateLimiter.addJob();
        const res = await bottleneck.schedule(()=> {
            console.log("[method: getAccountInfo]");
            return this.#restClientV5.getAccountInfo();
            // return res;
            // const res = await this.#restClientV5.getAccountInfo();
            // return res;
        });
        return res;
    }

    /**
     * returns api info of the logged in account
     */
    async getAPIKeyInformation(){
        // await this.#rateLimiter.addJob();
        const res = await bottleneck.schedule(()=> {
            console.log("[method: getAPIKeyInformation]");
            return this.#restClientV5.getQueryApiKey();
        });
        return res;
    }

    /**
     * 
     * @param {import("bybit-api").GetAccountCoinBalanceParamsV5} getAccountCoinBalanceParamsV5 
     */
    async getDerivativesCoinBalance(getAccountCoinBalanceParamsV5){
        // await this.#rateLimiter.addJob();
        const getCoinInformation_Res = await bottleneck.schedule(()=> this.#restClientV5.getCoinBalance(getAccountCoinBalanceParamsV5));
        console.log({getCoinInformation_Res, balance: getCoinInformation_Res.result.balance});
        // const getCoinInformation_Res = await bottleneck.schedule(()=> this.#accountAssetClient.getPrivate("/v5/account/wallet-balance","accountType=UNIFIED&coin=BTC"));
        return getCoinInformation_Res;
    }

    async getUSDTDerivativesAccountWalletBalance(){ 
        console.log("(fn:getUSDTDerivativesAccountWalletBalance)");
        const COIN = "USDT";//position.pair.toLowerCase().replace("usdt","").toUpperCase();
        const accountBalance_Resp = await this.getDerivativesCoinBalance({
            // accountType: "CONTRACT",
            accountType: "UNIFIED",
            coin: COIN,
            
        });
        if (!accountBalance_Resp.result || !accountBalance_Resp.result.balance) {
            console.log({ accountBalance_Resp });
            throw new Error(accountBalance_Resp.ret_msg);
        }
        const totalUSDT_balance = parseFloat(accountBalance_Resp.result.balance.walletBalance);
        return totalUSDT_balance;
    }
 

    //  // SUB ACCOUNTS
    // /**
    //  * @param {import("bybit-api").CreateSubMemberParamsV5} createSubMemberParamsV5
    //  */
    // async createSubAccount(createSubMemberParamsV5){
    //     // await this.#rateLimiter.addJob();
    //     const createSubMember_Res = await bottleneck.schedule(()=> this.#restClientV5.createSubMember(createSubMemberParamsV5));
    //     return createSubMember_Res;
    // }
    // /**
    //  * @param {import("bybit-api").CreateSubMemberRequestV3} createSubMemberRequestV3
    //  */
    // async getSubAccounts(){
    //     // await this.#rateLimiter.addJob();
    //     const res = await bottleneck.schedule(()=> this.#accountAssetClientV3.getSubAccounts());
    //     return res;
    // }




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
        // await this.#rateLimiter.addJob();
        console.log(FUNCTION_NAME);
        console.log({ orderParams, symbolLotStepSize, symbolMaxLotSize });
        if(!symbolLotStepSize|!symbolMaxLotSize){
            const standardized_qty = await this.#bybit.standardizeQuantity({quantity:orderParams.qty,symbol:orderParams.symbol});
            const requestParams = { ...orderParams, qty: String(standardized_qty[0] ) };
            // exeutte the request as is
            const openPositionRes = await  bottleneck.schedule(()=>this.#restClientV5.submitOrder(requestParams)); 
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
            const openPositionRes = await bottleneck.schedule(()=> this.#restClientV5.submitOrder(requestParams));
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
                const openPositionRes = await bottleneck.schedule(()=>this.#restClientV5.submitOrder(requestParams));
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
        const cancelOrderRes = await bottleneck.schedule(()=> this.#restClientV5.cancelOrder(cancelOrderParamsV5));
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
        // await this.#rateLimiter.addJob();
        console.log(FUNCTION_NAME);
   
        console.log({ orderParams, symbolLotStepSize, symbolMaxLotSize });
        if(!symbolLotStepSize||!symbolMaxLotSize){
            const standardized_qty = await this.#bybit.standardizeQuantity({quantity:orderParams.qty,symbol:orderParams.symbol});
            const requestParams = { ...orderParams, qty: String(standardized_qty[0] ) };
            const closePositionRes = await bottleneck.schedule(()=> this.#restClientV5.submitOrder(requestParams));
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
            const closePositionRes = await bottleneck.schedule(()=> this.#restClientV5.submitOrder(requestParams));
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
                const closePositionRes = await bottleneck.schedule(()=> this.#restClientV5.submitOrder(requestParams));
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
        // await this.#rateLimiter.addJob();
        console.log("[method: updateAPosition]");        
        console.log(amendOrderParamsV5);
        const res = await bottleneck.schedule(()=> this.#restClientV5.amendOrder(amendOrderParamsV5));        
        return res;
    }


    /**
     * 
     * @param {import("bybit-api").PositionInfoParamsV5} positionInfoParamsV5 
    */
    // * @returns {Promise<import("bybit-api").APIResponseV3WithTime<import("bybit-api").CategoryCursorListV5<import("bybit-api").PositionV5[], import("bybit-api").CategoryV5>>>}
    async getPositionInfo_Realtime(positionInfoParamsV5){
        // await this.#rateLimiter.addJob();
        console.log("[method: getPositionInfo_Realtime]");        
        console.log(positionInfoParamsV5);
        const res = await bottleneck.schedule(()=> this.#restClientV5.getPositionInfo(positionInfoParamsV5));
        return res;
    }

    /**
     * @param {import("bybit-api").GetAccountOrdersParams} getAccountOrdersParams
     */
    async getActiveOrders(getAccountOrdersParams){
        // await this.#rateLimiter.addJob();
        console.log("[method: getActiveOrders]");
        console.log(getAccountOrdersParams);
        return await bottleneck.schedule(()=> this.#restClientV5.getActiveOrders(getAccountOrdersParams));
    }

 

    /**
     * @param {import("bybit-api").GetAccountOrdersParams} getAccountOrdersParams 
     */
    async getOrderHistory(getAccountOrdersParams){
        // await this.#rateLimiter.addJob();
        console.log("[method: getOrderHistory]");
        return await bottleneck.schedule(()=> this.#restClientV5.getHistoricOrders(getAccountOrdersParams));
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
        // await this.#rateLimiter.addJob();
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
        // await this.#rateLimiter.addJob();
        console.log("[method: getWalletBalance]");
        const res =  await bottleneck.schedule(()=> this.#restClientV5.getWalletBalance(params));
        return res;
    }
    /**
     * 
     * @param {import('bybit-api').GetAllCoinsBalanceParamsV5} params 
     */
    async getAllCoinsBalance(params){
        // await this.#rateLimiter.addJob();
        console.log("[method: getAllCoinsBalance]");
        const res =  await bottleneck.schedule(()=> this.#restClientV5.getAllCoinsBalance(params));
        return res;
    }


    /**
     * 
     * @param {import("bybit-api").GetAccountOrdersParams} getAccountOrdersParams 
     */
    async getClosedPositionInfo(getAccountOrdersParams){
        // await this.#rateLimiter.addJob();
        // await this.#rateLimiter.addJob();
        console.log("[method: getClosedPositionInfo]");
        const res = await bottleneck.schedule(()=> this.#restClientV5.getHistoricOrders(getAccountOrdersParams));
        return res;
    }


    /**
     * 
     * @param {import("bybit-api").GetClosedPnLParamsV5} getClosedPnLParamsV5 
     */
    async getClosedPositionPNL(getClosedPnLParamsV5){
        // await this.#rateLimiter.addJob();
        // await this.#rateLimiter.addJob();
        console.log("[method: getClosedPositionInfo]");
        const res = await bottleneck.schedule(()=> this.#restClientV5.getClosedPnL(getClosedPnLParamsV5));
        return res;
    }

    /**
     * 
     * @param {import("bybit-api").CreateSubMemberParamsV5} createSubMemberParamsV5
     */
    async createSubAccount(createSubMemberParamsV5){
        // await this.#rateLimiter.addJob();
        console.log("[method: createSubAccount]");
        console.log(createSubMemberParamsV5);
        const res = await bottleneck.schedule(()=> this.#restClientV5.createSubMember(createSubMemberParamsV5));
        return res;
    }
    

    /**
     * This endpoint allows you to get a list of all sub UID of master account
     */
    async getSubUIDList(){
        // await this.#rateLimiter.addJob();
        console.log("[method: getSubUIDList]");
        const res = await bottleneck.schedule(()=> this.#restClientV5.getSubUIDList()); 
        return res;
    }


    /***
     * @param {import("bybit-api").CreateSubApiKeyParamsV5} createSubApiKeyParamsV5
     */
    async createSubAccountUIDAPIKey(createSubApiKeyParamsV5){
        // await this.#rateLimiter.addJob();
        console.log("[method: createSubAccountAPIKKey]");
        console.log(createSubApiKeyParamsV5);
        const res = await bottleneck.schedule(()=> this.#restClientV5.createSubUIDAPIKey(createSubApiKeyParamsV5));
        return res;
    }

    /**
     * It is a one-time switch which, once thrown, enables a subaccount permanently. If not set, your subaccount cannot use universal transfers.
     * @param {string[]} subMemberIds
     */
    async enableUniversalTransferForSubAccountsWithUIDs(subMemberIds){
        // await this.#rateLimiter.addJob();
        console.log("[method: enableUniversalTransferForUID]");
        const res = await bottleneck.schedule(()=> this.#restClientV5.enableUniversalTransferForSubUIDs(subMemberIds));
        return res;
    }

    async deleteSubApiKey(){
        // await this.#rateLimiter.addJob();
        console.log("[method: deleteSubApiKey]");
        const res = await bottleneck.schedule(()=> this.#restClientV5.deleteSubApiKey());
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
        // await this.#rateLimiter.addJob();
        console.log("[method: createUniversalTransfer]");
        console.log(universalTransferParamsV5);
        const res = await bottleneck.schedule(()=> this.#restClientV5.createUniversalTransfer(universalTransferParamsV5));
        return res;
    }



    async upgradeToUnifiedAccount(){
        console.log("[method: upgradeToUnifiedAccount]");
        // console.log(universalTransferParamsV5);
        const res = await bottleneck.schedule(()=> this.#restClientV5.upgradeToUnifiedAccount());
        return res;
    }
    


 



    
   


    
};
