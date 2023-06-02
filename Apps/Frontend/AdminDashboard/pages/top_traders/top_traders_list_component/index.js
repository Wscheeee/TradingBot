//@ts-check
class TopTradersList_Component extends HTMLElement {
    CLASS_NAME = "TopTradersList_Component"; 
    constructor(){
        super();
        this.attachShadow({mode:"open"});
        const template = document.createElement("template");
        fetchTemplateHTML("/pages/top_traders/top_traders_list_component/index.html").then((html)=>{
            console.log({html});
            template.innerHTML = html;
            if(!this.shadowRoot){
                console.error("[class:UserList_Component=>constructor (fn:fetchTemplateHTML)]this.shadowRoot:",this.shadowRoot);
                return;
            }
            this.shadowRoot.appendChild(template.content.cloneNode(true));
            this.listTopraders();

        });
        // Fetcch the skeleton html and attach to dom

    }

    listTopraders(){
        // Fetch users
        console.log("Fetching users");


        fetchTopTradersJSON({limit:10,skip:0}).then(traders => {
            const FUNCTION_NAME = "fetchTopTradersJSON";
            console.log({traders}); // fetched 
            if(!this.shadowRoot){
                console.error("[class:=>"+this.CLASS_NAME+"listTopraders (fn:fetchTopTradersJSON)]this.shadowRoot:",this.shadowRoot);
                return;
            }
            // show the users in the gui
            const ul = this.shadowRoot.querySelector("#list-ul");
            if(!ul){
                console.error("[class:"+this.CLASS_NAME+"=>listTopraders (fn:fetchUsersJSON)]ul:",ul);
                return;
            }
            for(const trader of traders){
                const li = document.createElement("li");
                li.classList.add("user_tile");
                const p1 = document.createElement("p");
                p1.textContent = trader.username;
                const p2 = document.createElement("p");
                p2.textContent = String(trader.uid);
                li.addEventListener("click",(e)=>{
                    if(!this.shadowRoot){
                        console.log(`[class:${this.CLASS_NAME}=>listUsers (fn:${FUNCTION_NAME}) users loop] this.shadowRoot:`,this.shadowRoot);
                    }
                    // remove active from the previous active list element
                    const li_NodeList = this.shadowRoot.querySelectorAll("li.user_tile");
                    const li_Array = Array.from(li_NodeList);
                    console.log({li_Array});
                    for(const li of li_Array){
                        if(li.classList.contains("active")){
                            li.classList.remove("active");
                        }
                    }
                    //Show as active
                    li.classList.add("active");
                    // Submit the click for other components to detect it
                    appStore.dispatchActionForSelectTopTrader_InTopTradersList(trader);
                });
                li.appendChild(p1);
                li.appendChild(p2);
                ul.appendChild(li);
            }

            // ul.appendChild(ul);

        }).catch(error=>{
            console.log({error});
        });
    }
    connectedCallback() {
        console.log("Custom square element added to page.");
        
          

    }
      
}


customElements.define("top-traders-list-component",TopTradersList_Component);