//@ts-check

/**
 * @typedef {()=>Promise<void>} AsyncFunction
 */
module.exports.IntervalLastInStackTaskRunner = class IntervalLastInStackTaskRunner {
    /**
     * Every incoming job is pushed in the stack
     * @type {AsyncFunction[]}
     */
    #jobStack = [];
    #uid = "";
    #intervalTimeInMs = 0;
    #intervalId;
    #jobIsRunning = false;
    /**
     * @constructor
     * @param {{uid:string, intervalMs:number}} settings
     */
    constructor({uid,intervalMs}){
        console.log("[Class:IntervalLastInStackTaskRunner => constructor:]",{uid,intervalMs});
        this.#uid = uid;
        this.#intervalTimeInMs = intervalMs;
        // create a place to store this

        // 
        this.#jobRunner();

    }

    #jobRunner(){
        // Run only the last in stack
        this.#intervalId = setInterval(async ()=>{
            const jobsLength = this.#jobStack.length;
            const jobInEndOfStack = this.#jobStack.at(-1);
            console.log("[Class:IntervalLastInStackTaskRunner => #jobRunner:] running job",{"#jobIsRunning":this.#jobIsRunning});
            if(jobInEndOfStack && this.#jobIsRunning===false){
                //clear the jobs left of the job
                // run the job
                console.log("[Class:IntervalLastInStackTaskRunner => #jobRunner:] running job");
                this.#jobIsRunning = true;
                await jobInEndOfStack();
                console.log("[Class:IntervalLastInStackTaskRunner => #jobRunner:] running job completed");
                let i =0;
                for(i=0;i<jobsLength;i++){
                    this.#jobStack.shift();
                }
                console.log("this.#jobStack.length",this.#jobStack.length);
                this.#jobIsRunning = false;

            }else {
                if(!jobInEndOfStack){
                    console.log("[Class:IntervalLastInStackTaskRunner => #jobRunner:] no job to run");

                }else if(!!jobInEndOfStack && this.#jobIsRunning===true){
                    console.log("[Class:IntervalLastInStackTaskRunner => #jobRunner:] there is a job to run but there is a job next after the ccurrent running job is completed");
                    
                }else {
                    console.log("[Class:IntervalLastInStackTaskRunner => #jobRunner:] not sure of this check");
                }
            }
        },this.#intervalTimeInMs);
    }

    stop(){
        console.log("[Class:IntervalLastInStackTaskRunner => #stop:] stoping");
        if(this.#intervalId){
            clearInterval(this.#intervalId);
            // this.#jobStack = [];

        }
    }


    /**
     * ads a job in the task runner
     * @param {AsyncFunction} job
     */
    addJob(job){
        console.log("[Class:IntervalLastInStackTaskRunner => addJob:] adding a job");
        clearInterval(this.#intervalId);
        this.#jobStack.push(job);
        this.#jobRunner();

    }
};