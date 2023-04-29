const crypto = require("node:crypto");
module.exports.generateUID = function generateUID(){
    return crypto.randomUUID();
};