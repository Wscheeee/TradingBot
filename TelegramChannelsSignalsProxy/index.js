//@ts-check

const {TelegramClient, Api} = require("telegram");
const {StringSession} = require("telegram/sessions");
// const bigInt = require("big-interger");
const {NewMessage,NewMessageEvent} = require("telegram/events");
const input = require("input");
const path = require("node:path");


const readFile = require("./filesystem/readFile");
const writeToFile = require("./filesystem/writeToFile");

const { PrivateSpaceInvestX_Channel } = require("./channels/signals_source/PRIVATE_SPACE_InvestX");


const PATH_TO_CLIENT_SESSION_STRING = path.join(__dirname,"files","clientSession.txt");
// const PATH_TO_MESSAGE_MIN_ID_STRING = path.join(__dirname,"..","files","channelMessageMinID.txt");

const telegramConfig = require("./telegramConfig.json");
const { ChatGetter } = require("telegram/tl/custom");
const { iterDialogs } = require("telegram/client/dialogs");
console.log({telegramConfig});
const dumpChannelDetails = {
    id:-1001840778594
};

const sarahDetails = {
    id:1024929179,
    name:"sarah"
};



module.exports.TelegramChannelsSignalsProxy =  class TelegramChannelsSignalsProxy {
    /**
     * @typedef {(
     *      channelName: string,
     *      signal: import("./types").Signal_Interface,
     *      originalMMessage: string,
     *      replyToMessage: string
     * )=>any} OnNewTradeListener_Callback_Interface
     */

    /**
     * @type {OnNewTradeListener_Callback_Interface[]}
     */
    #onNewTradeSignalListeners = [];
    
    constructor(){

    }

    /**
     * @param {OnNewTradeListener_Callback_Interface} cb
     */
    onTradeSignal(cb){
        this.#onNewTradeSignalListeners.push(cb);
    }

    async start(){
        const FUNCTION_NAME = "[class:TelegramChannelsSignalsProxyTelegramChannelsSignalsProxy => start]";
        try{

            console.log(FUNCTION_NAME);

            const clientSessionString = readFile(PATH_TO_CLIENT_SESSION_STRING)||undefined;
            const stringSession = new StringSession(clientSessionString);// fill the
    
    
            const client = new TelegramClient(stringSession,telegramConfig.app_id,telegramConfig.api_hash,{
                connectionRetries: 5
            });
            await client.connect();
            console.log("client.connected: ",client.connected);
            if(client.connected===false){
                await client.start({
                    phoneNumber: await input.text("Phone Number:"),
                    phoneCode: async ()=> await input.text("Phone Code:"),
                    onError: (err)=> console.log(err)
                });
                console.log("You should be connected by now!");
                const sesionString = client.session.save();
                console.log({sesionString});
                writeToFile(PATH_TO_CLIENT_SESSION_STRING,sesionString);
                // save the session string to file to avoid auth each time
    
            }
            // return;
            // Logged In
            const privateSpaceInvestX_Channel = new PrivateSpaceInvestX_Channel();
            const signalSourceChannelName_to_Class_Object = {
                [privateSpaceInvestX_Channel.name] :privateSpaceInvestX_Channel
            };


            const privateSpaceInvestX_Channel_CHAT = await client.getInputEntity(privateSpaceInvestX_Channel.id);
            // const messagesIter = await client.iterMessages(privateSpaceInvestX_Channel_CHAT);
            // const messagesIter2  = await messagesIter.client.getMessages(privateSpaceInvestX_Channel_CHAT,{
            //     limit: 10
            // });
            // console.log({messagesIter2});
            // for (const message of messagesIter2){
            //     console.log("Message text is",message.text);
            //     const decodedMessage = privateSpaceInvestX_Channel.decodeTradeSignalMessage(message.text||"");
            //     const replyToId = message.replyTo?message.replyTo.replyToMsgId:"";
            //     let replyToMessage = "";
            //     if(replyToId){
            //         const messagesIterReplyTo  = await messagesIter.client.getMessages(privateSpaceInvestX_Channel_CHAT,{
            //             limit: 1,
            //             ids: replyToId
            //         });
            //         replyToMessage  = messagesIterReplyTo[0].text;
            //     }
            //     console.log({decodedMessage});
            //     this.#onNewTradeSignalListeners.forEach((cb)=>{
            //         cb(privateSpaceInvestX_Channel.name,decodedMessage,message.text,replyToMessage);
            //     });
            // }
            // const marksmanshipExnessPremiumChannel = new MarksmanshipExnessPremiumChannel();
    
            let prevPrivateSpaceInvestX_Channel = "";
            // let prevMarksmanshipExnessPremiumSignalMessage = "";
            /**
             *  
             * @param {string} groupNameString 
             * @returns {(event:import("telegram/events").NewMessageEvent)=>void}
             */
            const generateNewMessageEventHandler = (groupNameString)=>{
                /**
                 * 
                 * @param {import("telegram/events").NewMessageEvent} event 
                 */
                const newMessageHandler = async (event)=>{
                    console.log("sending the recieved new message");
                    // event.message.message = `*[${groupNameString}]* \n${event.message.message}`;// this is the new received message
                    // await client.sendMessage(dumpChannelDetails.id,{message:event.message});// send the new message to the new channel
                    const decodedMessage = signalSourceChannelName_to_Class_Object[groupNameString].decodeTradeSignalMessage(event.message.message);
                    console.log({decodedMessage});
                    const replyToId = event.message.replyTo?event.message.replyTo.replyToMsgId:"";
                    let replyToMessage = "";
                    if(replyToId){
                        const messagesIterReplyTo  = await client.getMessages(privateSpaceInvestX_Channel_CHAT,{
                            limit: 1,
                            ids: replyToId
                        });
                        replyToMessage  = messagesIterReplyTo[0].text;
                    }
                    
                    this.#onNewTradeSignalListeners.forEach((cb)=>{
                        cb(groupNameString,decodedMessage,event.message.message,replyToMessage);
                    });
             
    
                };
                return newMessageHandler;
            };
    
    
            /***
             * @param {"me"|"sarah"|"dumpChannel"} userName
             * @returns {(event:NewMessageEvent)=>void}
             */
            const generateNewMessageFromUserEventHandler = (userName)=>async function handleUserMessagesCommands(event){
                const userCommands = {
                    "/bot showOpenTrades":""//trader.getOpenTrades()
                };
                if(event.message && event.message.message){
                    if(userName==="me"){
                        // console.log({userName ,msg:event.message})
                        //@ts-ignore
                        const respMessage = await userCommands[event.message.message];
                        if(respMessage){
                            await client.sendMessage("me",{message:respMessage});    
                        }
                    }else if(userName==="sarah"){
                        //@ts-ignore
                        const respMessage = await userCommands[event.message.message];
                        if(respMessage){
                            await client.sendMessage(sarahDetails.id,{message:respMessage});  
                        }
                    }else if(userName==="dumpChannel"){
                        //@ts-ignore
                        const respMessage = await userCommands[event.message.message];
                        if(respMessage){
                            await client.sendMessage(dumpChannelDetails.id,{message:respMessage});  
                        }
                    }else {}
                    
                }
            };
            /**
             * Source channels
            */
            client.addEventHandler(generateNewMessageEventHandler(privateSpaceInvestX_Channel.name),new NewMessage({
                chats:[privateSpaceInvestX_Channel.id]
            }));
            
    
            
            
            
            
            const me = await client.getEntity("me");
            client.addEventHandler(generateNewMessageFromUserEventHandler("me"),new NewMessage({
                chats:[me.id]
            }));
            // client.addEventHandler(generateNewMessageFromUserEventHandler("sarah"),new NewMessage({
            //     chats:[sarahDetails.id]
            // }))
            // client.addEventHandler(generateNewMessageFromUserEventHandler("dumpChannel"),new NewMessage({
            //     chats:[dumpChannelDetails.id]
            // }))
            // const chat = await client.getInputEntity(privateSpaceInvestX_Channel.link);
            // console.log((await client.getMessages(chat)));
            // const me = await client.getEntity("me");
            // console.log("My name is",utils.getDisplayName(me));

            

            
        }catch(error){
            const newErrorMessage = `${FUNCTION_NAME}:${error.message}`;
            error.message = newErrorMessage;
            throw error;
        }
    }
};