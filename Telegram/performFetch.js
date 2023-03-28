const http = require('http');
const https = require('https');
const URL = require('url');

/**
 * 
*@typedef  {{
*    hostname?:string,
*    port:number,
*    path?: string,
*    method: 'GET'|'POST',
*    body?: string,
*    url?:string
*}} Options_Type
 */

/**
 * @param {Options_Type} param
 * 
 */
module.exports.performFetch =  function performFetch({hostname,port,path,method,body,url}){
    /**
     * @type {http|https}
     */
    let httpOrHttpsToUse;
    if(url){
        // https://api.telegram.org/bot<token>/METHOD_NAME
        let characters = ''
        let foundEndOfProtocal = false;
        let foundEndOfHostname = false;
        url.split('').forEach((c)=>{
            switch(characters){
                case 'http://':
                    foundEndOfProtocal=true
                    break;
                case 'https://':
                    foundEndOfProtocal=true;
                    break;
                default:
                    break;
            }
            characters+=c;
            if(c=='/' && foundEndOfProtocal &&!foundEndOfHostname){
                // end of hostname
                hostname = characters;
                characters=''
                foundEndOfHostname=true;
                // console.log('FOUND HOSTNAME:',hostname,characters)
            }
        })
        if(foundEndOfHostname&&foundEndOfProtocal){
            // the remaining characters is path
            // console.log('FOUND PATH:',characters)
            path = characters;
        }
        

    }
    // console.log({
    //     hostname,
    //     path,
    //     port
    // })
    return new Promise((resolve,reject)=>{
        let hostname_ = hostname;
        if(hostname.includes('https')){
            httpOrHttpsToUse = https;
            hostname_ = hostname.replace('https://','')
        }else {
            httpOrHttpsToUse = http;
            hostname_ = hostname.replace('http://','')
        }
 
        const request = httpOrHttpsToUse.request(
            {
            hostname:hostname_,
            port,
            path,
            method,
            headers: {
                'Content-Type':'application/json',
                'Content-Length':body?body.length:0
            },
        }
        ,(res)=>{
            let dataString = ''
            res.on('error',(error)=>{
                // console.log({error})
                reject(error)
            })
            res.on('data',(chunk)=>{
                dataString+=chunk
            })
            res.on('end',()=>{
                // convert the dataString to a typed response
                // Assumes response type is JSON
                try {
                    // console.log({dataString})
                    const parsedJSONData =  JSON.parse(dataString)
                    resolve(parsedJSONData)
                }catch(error){
                    reject('Invalid JSON response: ' +dataString)
                }
            })
        })
        if(method=='POST'){
            request.write(body)
        }
        request.end()
        request.on('error',(err)=>{
            reject(err)
        })

    })
}