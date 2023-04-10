
/**
 * @typedef {{delayms:number}} RateLimiterSettings_Interface
 */

module.exports.RateLimiter = class RateLimiter {
    // PARAMETERS
    /**
     * JOBS LIST
     * @type {Function[]} 
     */
    #jobsList = [];

    /***
     * @type {number}
     */
    #interval;
    /**
     * @type {RateLimiterSettings_Interface}
     */
    #settings;

    // /**
    //      * @description Locks make request is a resquest is running. Makes sure requeste run one after the other.
    //      */
    // #requestIsRunningLock = false;

    /**
     * @constructor
     * @param {RateLimiterSettings_Interface} settings
     */
    constructor(settings){
        this.#settings = settings;

        this.#interval = setInterval(async ()=>{
            const job = this.#jobsList.shift();
            if(job){
                await job();
            }
        },settings.delayms);

    }
    stop() {
        if (this.#interval) {
            clearInterval(this.#interval);
            this.#interval = null;
        }
    }

    // set_requestIsRunningLock(){
    //     if(this.#requestIsRunningLock){
    //         this.#requestIsRunningLock = false;
    //     }else {
    //         this.#requestIsRunningLock = true;
    //     }
    // }
    // remove_requestIsRunningLock(){
    //     this.#requestIsRunningLock = false;
    // }

    /**
     * 
     * @param {Function} fn 
     */
    addJob(){
        function fn(){
            return;
        }
        return new Promise((resolve,reject)=>{
            const wrappedJob = () => {
                try{
                    fn();
                    resolve();

                }catch(error){
                    reject(error);
                }
            };
            this.#jobsList.push(wrappedJob);
        });
    }

    


    // /**
    // * 
    // * @param {number?} ms 
    // * @returns {Promise<boolean>}
    // */
    // async delayAsync (ms=this.#settings.delayms){
    //     console.log("Waiting for a delay of ms:",ms);
    //     console.log({requestIsRunningLock:this.#requestIsRunningLock});
    //     return new Promise((resolve)=>{
    //         const timeout = setTimeout(async ()=>{
    //             console.log({requestIsRunningLock:this.#requestIsRunningLock});
    //             if(this.#requestIsRunningLock===false){
    //                 console.log("Delay end:s");
    //                 clearTimeout(timeout);
    //                 resolve(true);
    //             }else {
    //                 this.#requestIsRunningLock = false;
    //                 console.log("Reecursive",{requestIsRunningLock:this.#requestIsRunningLock});
    //                 await this.delayAsync(ms);
    //             }
    //         },ms);
    //     });
    // }
};