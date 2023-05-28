//@ts-check

const querystring = require("node:querystring");
const {Bybit} = require("../../../../Trader");



/**
 * @param {{
 *      method:"GET"|"POST"|string,
 *      url: string,
 *      mongoDatabase: import("../../../../MongoDatabase").MongoDatabase,
 *      req: import("http").IncomingMessage,
 *      res: import("http").ServerResponse
 * }} params
 */
module.exports.usersRoutes = async function usersRoutes({method,url,mongoDatabase,req,res}){
    try{
        console.log("(fn:usersRoutes)");
        if(url==="/users"){
            if(method==="GET"){
                // return a list of users
                // Get the users from the db
                const users = await mongoDatabase.collection.usersCollection.getAllDocuments();
                const usersArray = await users.toArray();
                
                /**
                 * @type {import("./types").Users_Routes_Payload_Interface}
                 */
                const payload = {
                    success: true,
                    data:{
                        users: usersArray
                    },
                    message:""
                };
                res.write(JSON.stringify(payload));
                console.log("Returning from route:",req.url);
                res.end();
                
            }
        }
    }catch(error){
        const newErrorMessage = `(fn:usersRoutes) ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};