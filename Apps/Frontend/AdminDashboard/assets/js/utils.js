//@ts-check

/**
 * 
 * @param {string} url 
 * @returns 
 */
async function performJSONFetch(url){
    let respClone;
    try{
        const headers = new Headers();
        headers.append("Access-Control-Allow-Origin","*");
        headers.append("Content-Type","application/json");
        const response = await fetch(url,{
            headers: headers,
            // mode:"no-cors",

        });
        respClone = response.clone();
        return await response.json();
    }catch(error){
        const responseText = await respClone?.text();
        console.log({responseText});
        console.log({error});
        throw error;
    }
}

// const headers = new Headers();
// headers.append("")
/**
 * @param {string} url
 */
async function fetchTemplateHTML(url) {//url:"/components/user_content_component/index.html"
    const headers = new Headers();
    headers.append("Access-Control-Allow-Origin","*");
    const response = await fetch(url,{
        headers:headers,
        // mode:"no-cors"

    });
   
    /**
      * @type {string}
      */
    const resp = await response.text();
     
    return resp;
}
   


async function fetchUsersJSON() {
    const headers = new Headers();
    headers.append("Access-Control-Allow-Origin","*");
    /**
     * @type {import("../../../../API_AdminDashboard/routes/users/types").Users_Routes_Payload_Interface}
    */
    const respJson = await performJSONFetch("http://localhost:30003/users");
    // const resp = {
    //    data:{
    //     users:[
    //         {
    //         _id:"",
    //         tg_user_id:"101",
    //         username:"Speeet",
    //         },
    //         {
    //         _id:"",
    //         tg_user_id:"101",
    //         username:"Speeet",
    //         },
    //         {
    //         _id:"",
    //         tg_user_id:"101",
    //         username:"Speeet",
    //         },
    //         {
    //         _id:"",
    //         tg_user_id:"101",
    //         username:"Speeet",
    //         },
    //         {
    //         _id:"",
    //         tg_user_id:"101",
    //         username:"Speeet",
    //         },
    //         {
    //         _id:"",
    //         tg_user_id:"101",
    //         username:"Speeet",
    //         },
    //         {
    //         _id:"",
    //         tg_user_id:"101",
    //         username:"Speeet",
    //         },
    //         {
    //         _id:"",
    //         tg_user_id:"101",
    //         username:"Speeet",
    //         },
    //         {
    //         _id:"",
    //         tg_user_id:"101",
    //         username:"Speeet",
    //         },
    //         {
    //         _id:"",
    //         tg_user_id:"101",
    //         username:"Speeet",
    //         },
    //         {
    //         _id:"",
    //         tg_user_id:"101",
    //         username:"Speeet",
    //         },
    //         {
    //         _id:"",
    //         tg_user_id:"101",
    //         username:"Speeet",
    //         },
    //    ]
    //    },
    //    message:"",
    //    success:true
    // };
  
    return respJson.data.users;
}

/***
* Fetch sub accounts
*/
// fetch the sub accounts
/**
 * 
 * @param {{tg_user_id:number}} param0 
 */
async function fetchSubAccounts({
    tg_user_id
}) {
    const headers = new Headers();
    headers.append("Access-Control-Allow-Origin","*");
    // const response = await fetch("http://localhost:30003/subaccounts?tg_user_id=101",{
    //     headers:headers,
    //     mode:"no-cors"
    // });
    /**
     * @type {import("../../../../API_AdminDashboard/routes/subaccounts/types").SubAccounts_Routes_Payload_Interface}
    */
    const respJson = await performJSONFetch("http://localhost:30003/subaccounts?tg_user_id="+tg_user_id);
    // const resp = {
    //     data:{
    //         sub_accounts:[{
    //             _id:"asas",
    //             document_created_at_datetime:"",
    //             sub_link_name:"sub 1",
    //             sub_account_uid:"121212",
    //             trader_uid:"101"
    //         }]
    //     },
    //     message:"",
    //     success:true
    // };
    // const resp = await response.json();
    console.log({respJson});
    return respJson.data.sub_accounts;//.data.users;
}


/**
 * 
 * @param {{
 *      sub_account_uid:number
 * }} param0
 */
async function fetchSubAccountOpenPositionsJSON({sub_account_uid}){
    const headers = new Headers();
    headers.append("Access-Control-Allow-Origin","*");

    /**
     * @type {import("../../../../API_AdminDashboard/routes/open_positions/types").GetOpenPositions_ResponsePayload_Interface}
    */
    const respJson = await performJSONFetch("http://localhost:30003/open-positions?sub_account_uid="+sub_account_uid);

    console.log({respJson});
    return respJson.data.orders;//.data.users;
}