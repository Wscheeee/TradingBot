// const DateX = Date;
// class DateTime{
//     constructor(){
//         const now = new DateX();
//         const localTimeString = now.toLocaleTimeString("en-US", { hour12: false });
//         return localTimeString;
//         // const [hours, minutes, seconds] = localTimeString.split(":");
//     }
//     // a(){
        
//     // }
// }

// Date = DateTime;
// console.log(new Date());

class handler {
    get(a){
        console.log(a);
    }
}

const DateProxy = new Proxy(Date,{
    get: (target,p,receiver)=>{
        console.log({target,receiver,p});
        return [target,receiver]
    }
});

new DateProxy();