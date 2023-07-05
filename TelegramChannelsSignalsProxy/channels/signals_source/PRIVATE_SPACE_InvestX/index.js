//@ts-check
const {TGChannel}  = require("../../TGChannel");

//locals
const {parseSignal} = require("./parseMessage");

module.exports.PrivateSpaceInvestX_Channel = class PrivateSpaceInvestX_Channel extends TGChannel{ 
    constructor(){
        super();
        this.name = "PRIVATE SPACE_ InvestX";
        this.id = -1001240221457;
        this.username = "";
        this.link = "https://t.me/+5RjBF4DAnjdlZjRk";
    }

    decodeTradeSignalMessage(message){
        const FUNCTION_NAME = "(fn:decodeTradeSignalMessage)";
        try{
            console.log(FUNCTION_NAME+" "+message);
            return parseSignal(message);
            // return {
            //     direction:"LONG",
            //     SL:0,
            //     symbol:"",
            //     TPs:[]
            // };
        }catch(error){
            const newErrorMessage = `${FUNCTION_NAME}: ${error.message}`;
            error.message = newErrorMessage;
            throw newErrorMessage;
        }
        
    }
     

};



