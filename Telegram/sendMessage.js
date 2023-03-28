const { createBotApiUrl } = require("./createBotApiUrl");
const { performFetch } = require("./performFetch");

const sendMessageUrlObj = createBotApiUrl('sendmessage');
console.log({sendMessageUrlObj})
/**
 * @typedef {{
 *      ok: boolean,
 *      result: {
 *          message_id: number,
 *          from: {
 *              id: number,
 *              is_bot: boolean,
 *              first_name: string,
 *              username: string
 *          },
 *          chat: {
 *              id: number,
 *              first_name: string,
 *              last_name: string,
 *              type: 'private'
 *          },
 *          date: number,
 *          text: string
 *       }
 * }} SendMessageResponse_Interface
 */


/**
 * @param {{chat_id:number,text:string}}
 * @return {Promise<SendMessageResponse_Interface>}
 */
module.exports.sendMessage =  async function sendMessage({chat_id,text}){
  console.log('Sending message',text)
    try {
        /**
         * @type {SendMessageResponse_Interface}
         */
        const res = await performFetch({
            hostname: sendMessageUrlObj.hostname,
            path: sendMessageUrlObj.path,
            method: 'POST',
            body: JSON.stringify({
                chat_id,
                text:text
            }),
            port:443,
        })
        console.log(res)
        return res
    }catch(error){
        throw error;
    }
}