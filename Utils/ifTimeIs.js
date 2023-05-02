class IfTimeIs {
    #time = {
        hours:null,
        minutes:null
    };
    /**
     * @constructor
     * @param {{
     *      hours?: number,
     *      minutes?: number
     * }}
     */
    constructor({hours,minutes}){
        this.#time = {
            hours,minutes
        };
    }

    getNowHours(){
        return new Date().getHours();
    }

    getNowMinutes(){
        return new Date().getMinutes();
    }

    isTime(){
        const {hours,minutes} = this.#time;
        if(hours ==null){
            // same hour
            if(minutes==null){
                return true;
            }else {
                if(minutes===this.getNowMinutes()){
                    return true; 
                }else {
                    return false;
                }
            }
        }else {
            if(hours ==this.getNowHours()){
                // same hour
                if(minutes==null){
                    return true;
                }else {
                    if(minutes===this.getNowMinutes()){
                        return true; 
                    }else {
                        return false;
                    }
                }
            }
        }
    }
}