module.exports.IfHoursPassed = class IfHoursPassed {
    /**
     * 
     * @type {number} 
     */
    #hoursInMilliseconds;
    /**
     * 
     * @type {number}  
     */
    #startTimeInMilliseconds;

    /**
     * 
     * @param {number} hours 
     */
    constructor(hours){
        const oneHourInMs = ((1000*60)*60);
        this.#hoursInMilliseconds = oneHourInMs*hours;
    }
    start(){
        this.#startTimeInMilliseconds = Date.now();
    }

    isTrue(){
        const nowTimeInMs = Date.now();
        const deltaTimeInMs = nowTimeInMs - this.#startTimeInMilliseconds;
        if(deltaTimeInMs >= this.#hoursInMilliseconds){
            return true;
        }else {
            return false;
        }
    }


    // STATIC
    /**
     * 
     * @param {numbeer} fromTimestamp 
     * @returns 
     */
    static from(fromTimestamp){
        return {
            /**
             * 
             * @param {number} toTimestamp 
             * @returns 
             */
            to: (toTimestamp)=>{
                return {
                    /**
                     * 
                     * @param {number} hours 
                     */
                    hours:(hours)=>{
                        const deltaTimeInMs = toTimestamp - fromTimestamp;
                        if(deltaTimeInMs >= ((this.#hoursInMilliseconds)*hours)){
                            return true;
                        }else {
                            return false;
                        }
                    }
                };
            }
        };
    }
}