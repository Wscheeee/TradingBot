
`Invalid code`

"use-strict";

const { AccountAssetClient, } = require("bybit-api");
const {RateLimiter} = require("../utils/RateLimiter");


module.exports.Bybit_AccountAssetClientV3 = class Bybit_AccountAssetClientV3 {
    // STATIC
    /**
     * @param {{publicKey:string,privateKey:string,testnet:boolean}}
     * @returns {AccountAssetClient}
     */
    static  createAccountAssetClientV3({privateKey,publicKey,testnet}){
        const accountAssetClientV3 =  new AccountAssetClient({
            key: publicKey,
            secret: privateKey,
            testnet:testnet
        });
        accountAssetClientV3.createSubAccountTransfer({

        })
        return accountAssetClientV3;
		
    }


    /**
     * @type {RateLimiter}
     */
    #rateLimiter;
    /**
     * @type {AccountAssetClientV3}
     */
    #accountAssetClientV3;

    /**
     * 
     * @param {{accountAssetClientV3:AccountAssetClientV3,millisecondsToDelayBetweenRequests:number}} settings 
     */
    constructor({accountAssetClientV3,millisecondsToDelayBetweenRequests}){
        this.#accountAssetClientV3 = accountAssetClientV3;
        this.#rateLimiter = new RateLimiter({
            delayms: millisecondsToDelayBetweenRequests
        });
    }


    /**
     * 
     * @param {import("bybit-api").SingleAccountCoinBalanceRequestV3} singleAccountCoinBalanceRequestV3 
     */
    async getDerivativesCoinBalance(singleAccountCoinBalanceRequestV3){
        await this.#rateLimiter.addJob();
        const getCoinInformation_Res = await this.#accountAssetClientV3.getAccountCoinBalance(singleAccountCoinBalanceRequestV3);
        return getCoinInformation_Res;
    }

    // SUB ACCOUNTS
    /**
     * @param {import("bybit-api").CreateSubMemberRequestV3} createSubMemberRequestV3
     */
    async createSubAccount(createSubMemberRequestV3){
        await this.#rateLimiter.addJob();
        const createSubMember_Res = await this.#accountAssetClientV3.createSubMember(createSubMemberRequestV3);
        return createSubMember_Res;
    }
    /**
     * @param {import("bybit-api").CreateSubMemberRequestV3} createSubMemberRequestV3
     */
    async getSubAccounts(){
        await this.#rateLimiter.addJob();
        const res = await this.#accountAssetClientV3.getSubAccounts();
        return res;
    }


    /**
     * 
     * @param {import("bybit-api").CreateSubAPIKeyRequestV3} createSubAPIKeyRequestV3
     */
    async createSubAccountAPIKey(createSubAPIKeyRequestV3){
        await this.#rateLimiter.addJob();
        const res = await this.#accountAssetClientV3.createSubAPIKey(createSubAPIKeyRequestV3);
        return res;
    }

    /**
     *@description returns api info of the logged in account
     */
    async getAPIKeyInformation(){
        await this.#rateLimiter.addJob();
        const res = await this.#accountAssetClientV3.getAPIKeyInformation();
        return res;
    }

    /**
     *@description Deletes the api key of the logged in sub account:instant
     */
    async deleteSubAccountAPIKey(){
        await this.#rateLimiter.addJob();
        const res = await this.#accountAssetClientV3.deleteSubAPIKey();
        return res;
    }

    /**
     * 
     * @param {import("bybit-api").ModifyAPIKeyRequestV3} modifyAPIKeyRequestV3
     */
    async modifySubAccountAPIKey(modifyAPIKeyRequestV3){
        await this.#rateLimiter.addJob();
        const res = await this.#accountAssetClientV3.modifySubAPIKey(modifyAPIKeyRequestV3);
        return res;
    }

    /**
     * 
     * @param {import("bybit-api").ModifyAPIKeyRequestV3} modifyAPIKeyRequestV3
     */
    async modifySubAccountAPIKey(modifyAPIKeyRequestV3){
        await this.#rateLimiter.addJob();
        const res = await this.#accountAssetClientV3.createInternalTransfer({
            amount:0,
            fromAccountType:
        });
        return res;
    }



};