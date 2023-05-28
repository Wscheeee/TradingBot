//@ts-check
class UserList_Component extends HTMLElement {
    constructor(){
        super();
        this.attachShadow({mode:"open"});
        const template = document.createElement("template");
        fetchTemplateHTML("/pages/users/user_list_component/index.html").then((html)=>{
            console.log({html});
            template.innerHTML = html;
            if(!this.shadowRoot){
                console.error("[class:UserList_Component=>constructor (fn:fetchTemplateHTML)]this.shadowRoot:",this.shadowRoot);
                return;
            }
            this.shadowRoot.appendChild(template.content.cloneNode(true));
            this.listUsers();

        });
        // Fetcch the skeleton html and attach to dom

    }

    listUsers(){
        // Fetch users
        console.log("Fetching users");


        fetchUsersJSON().then(users => {
            console.log({users}); // fetched users
            if(!this.shadowRoot){
                console.error("[class:UserList_Component=>listUsers (fn:fetchUsersJSON)]this.shadowRoot:",this.shadowRoot);
                return;
            }
            // show the users in the gui
            const ul = this.shadowRoot.querySelector("#list-ul");
            if(!ul){
                console.error("[class:UserList_Component=>listUsers (fn:fetchUsersJSON)]ul:",ul);
                return;
            }
            for(const user of users){
                const li = document.createElement("li");
                li.classList.add("user_tile");
                const p1 = document.createElement("p");
                p1.textContent = user.username;
                const p2 = document.createElement("p");
                p2.textContent = String(user.tg_user_id);
                li.addEventListener("click",(e)=>{
                    if(!this.shadowRoot){
                        console.log("[class:UserList_Component=>listUsers (fn:fetchUsersJSON) users loop] this.shadowRoot:",this.shadowRoot);
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
                    appStore.dispatchActionForSelectUser_InUsersList(user);
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


customElements.define("users-list-component",UserList_Component);