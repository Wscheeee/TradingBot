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
    /**
     * Every incoming job is pushed in the stack
     * @type {AsyncFunction[]}
     */
    #mustRunJobStack = [];
    #uid = "";
    #intervalTimeInMs = 0;
    #intervalId;
    #jobIsRunning = false;
    #mustRunJobIsRunning = false;
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
            // Run must run jobs 
            console.log("[Class:IntervalLastInStackTaskRunner => #jobRunner:] running job",{"#jobIsRunning":this.#jobIsRunning,"#this.#mustRunJobIsRunning":this.#mustRunJobIsRunning});
            
            if(this.#mustRunJobIsRunning===false){
                this.#mustRunJobIsRunning = true;
                console.log("Must Run Jobs length = "+this.#mustRunJobStack.length);
                for(const job of this.#mustRunJobStack){
                    console.log("Running must run jobs");
                    await job();
                    this.#mustRunJobStack.shift();
                }
                this.#mustRunJobIsRunning = false;

            }
            
           
           

            // Run other jobs


            const jobsLength = this.#jobStack.length;
            const jobInEndOfStack = this.#jobStack.at(-1);
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
                    console.log("[Class:IntervalLastInStackTaskRunner => #jobRunner:] there is a job running "+(jobsLength>1?"and there is a job to run next after it":""));
                    
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

    stopInterval(){
        console.log("[Class:IntervalLastInStackTaskRunner => #stopInterval:] stoping");
        clearInterval(this.#intervalId);
    }
    startInterval(){
        console.log("[Class:IntervalLastInStackTaskRunner => #startInterval:] stoping");
        this.#jobRunner();
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

    /**
     * ads a must rrun job in the task runner
     * @param {AsyncFunction} job
     */
    addMustRunJob(job){
        console.log("[Class:IntervalLastInStackTaskRunner => addMustRunJob:] adding a job");
        clearInterval(this.#intervalId);
        this.#mustRunJobStack.push(job);
        this.#jobRunner();

    }
};