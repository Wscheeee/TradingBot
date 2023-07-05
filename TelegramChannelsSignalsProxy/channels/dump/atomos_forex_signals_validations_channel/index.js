const {SignalChannel}  = require("../../TGChannel");

// /**
//  * @interface 
//  */
// function TGSignalChannels_Interface(){
//     /**
//      * @type {string}
//      */
//     this.name = "";
// }


/**
 * @implements {TGSignalChannels_Interface}
 */
module.exports.PrivateSpaceInvestX_Channel = class PrivateSpaceInvestX_Channel extends SignalChannel{ 
    name = "FX_SIG Validation Queue Atomos";
    id = -191919;

    constructor(){
        super();
    }

};