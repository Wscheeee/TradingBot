//@ts-check
class UsersContentComponent extends HTMLElement {
    constructor(){
        super();
        this.attachShadow({mode:"open"});
        this.controller = new AbortController();
        this.signal = this.controller.signal;

        fetchTemplateHTML("/pages/users/users_content_component/index.html").then(componentHtml => {
            if(!this.shadowRoot)return;
            console.log({componentHtml}); // fetched componentHtml
            // const t = document.createDocumentFragment();
            const template = document.createElement("template");
            template.innerHTML = componentHtml;

            // // show in the gui
            this.shadowRoot.appendChild(template.content.cloneNode(true));
            console.log("add the init html");

            appStore.listenToUserClick_InUsersList((clickedUser)=>{
                // Clear Positions Table
                const account_positions_table_container_Elem = this.shadowRoot?.querySelector("#account_positions_table_container");
                if(!account_positions_table_container_Elem){
                    console.error("account_positions_table_container_Elem not found");
                }else {
                    account_positions_table_container_Elem.innerHTML = "";
                }
                // Get thee uuser's info and load te necessary data
                const usernameElementDiv = this.shadowRoot?.querySelector("#username");
                if(usernameElementDiv){
                    usernameElementDiv.textContent = clickedUser.username;
                }
                this.listSubAccounts({
                    tg_user_id: clickedUser.tg_user_id
                });
            });
        }).catch(error=>{
            console.log({error});
        });
    }
    /**
     * @param {{tg_user_id:number}} param0
     */
    listSubAccounts({tg_user_id}){
        if(!this.shadowRoot){
            console.log("[class:UserContentComponent=>connectedCallback (fn:fetchTemplateHTML)]this.shadowRoot:",this.shadowRoot);return;
        }

        const subAccountsUl = this.shadowRoot.querySelector("#sub_account_ul");
        console.log({subAccountsUl});
        if(!subAccountsUl){
            console.log("[class:UserContentComponent=>connectedCallback (fn:fetchTemplateHTML)]subAccountsUl not found:",subAccountsUl);return;
        }
        // Clear subAccountsUl child nodes
        subAccountsUl.childNodes.forEach((childNode)=>childNode.remove());
        // Show loader
        subAccountsUl.innerHTML = "<loader-component/>";
        fetchSubAccounts({tg_user_id}).then(subAccounts =>{
            // remove loader
            subAccountsUl.innerHTML = "";
            // loop throught the sub accounts and then show them in the gui
            for(const subAcccount of subAccounts){
                const li = document.createElement("li");
                li.classList.add("sub_account_tile");
                const p1 = document.createElement("li");
                p1.textContent = String(subAcccount.sub_account_uid);
                p1.title = `sub_link_name: ${subAcccount.sub_link_name}`;
                li.appendChild(p1);
                subAccountsUl.appendChild(li);

                li.addEventListener("click",(e)=>{
                    if(!this.shadowRoot){
                        console.log("[class:UserContentComponent=>listUsers (fn:fetchSubAccounts) users loop] this.shadowRoot:",this.shadowRoot);
                        return;
                    }
                    // remove active from the previous active list element
                    const li_NodeList = this.shadowRoot.querySelectorAll("#sub_account_ul>li");
                    const li_Array = Array.from(li_NodeList);
                    console.log({li_Array});
                    for(const li of li_Array){
                        if(li.classList.contains("active")){
                            li.classList.remove("active");
                        }
                    }
                    //Show as active
                    li.classList.add("active");
                    // Fetch sub Accountt Details
                    const {trader_username,weight,trader_uid,sub_link_name,sub_account_username,testnet, sub_account_uid} = subAcccount;
                    const sub_account_username_Elem = this.shadowRoot.querySelector("#sub_account_username");
                    sub_account_username_Elem?sub_account_username_Elem.textContent = `${sub_account_username}`:null;
                    const sub_account_uid_Elem = this.shadowRoot.querySelector("#sub_account_uid");
                    sub_account_uid_Elem?sub_account_uid_Elem.textContent = `${sub_account_uid}`:null;
                    const sub_link_name_Elem = this.shadowRoot.querySelector("#sub_link_name");
                    sub_link_name_Elem?sub_link_name_Elem.textContent = `${sub_link_name}`:null;
                    const testnet_Elem = this.shadowRoot.querySelector("#testnet");
                    testnet_Elem?testnet_Elem.textContent = `${testnet}`:null;
                    const trader_username_Elem = this.shadowRoot.querySelector("#trader_username");
                    trader_username_Elem?trader_username_Elem.textContent = `${trader_username}`:null;
                    const trader_uid_Elem = this.shadowRoot.querySelector("#trader_uid");
                    trader_uid_Elem?trader_uid_Elem.textContent = `${trader_uid}`:null;
                    const weight_Elem = this.shadowRoot.querySelector("#weight");
                    weight_Elem?weight_Elem.textContent = `${weight}`:null;
 
 

                    // Fetch Sub Account Open Positions
                    // Show loader
                    const account_positions_table_container_Elem = this.shadowRoot?.querySelector("#account_positions_table_container");
                    if(!account_positions_table_container_Elem)throw new Error("account_positions_table_container_Elem not found");
                    account_positions_table_container_Elem.innerHTML = "<loader-component/>";
                    fetchSubAccountOpenPositionsJSON({sub_account_uid}).then((positions)=>{
                        //remove loader
                        account_positions_table_container_Elem.innerHTML = "";
                        console.log({positions});
                        // Create the headers and body of the table
                        const headers = ["Symbol","Leverage","Side","Quantity","Entry Price","Mark Price","Unrealized pnl","cumRealisedPnl","positionValue","positionStatus"];
                        
                        /**
                         * @type {string[][]}
                         */
                        const body = [ ];
                        for(const position of positions){
                            const {markPrice,leverage,side,symbol,unrealisedPnl,cumRealisedPnl,size,positionStatus,positionValue,avgPrice} = position;
                            body.push([
                                //@ts-ignore
                                symbol,leverage,side,size,avgPrice,markPrice,unrealisedPnl,cumRealisedPnl,positionValue,positionStatus
                            ]);

                        }
                        const TABLE_UID =  "subAccountPositions_TABLE";
                        // Attach the table
                        // const account_positions_table_container_Elem = this.shadowRoot?.querySelector("#account_positions_table_container");
                        // if(!account_positions_table_container_Elem)throw new Error("account_positions_table_container_Elem not found");
                        account_positions_table_container_Elem.innerHTML = `<table-component uid=${TABLE_UID}></table-component>`;
                        appStore.dispatchTableData(TABLE_UID,{
                            body,headers
                        });
                    }).catch(error=>{
                        console.log(error);
                    });

                    // Submit the click for other components to detect it
                    // appStore.dispatchActionForSelectUser_InUsersList(user);
                });
            }
        }).catch(error=>{
            console.log({error});
        });

    }
    connectedCallback() {
        console.log("UserContentComponent connectedCallback");
        
       

     
    }
      
}


customElements.define("users-content-component",UsersContentComponent);