//@ts-check
class UserContentComponent extends HTMLElement {
    constructor(){
        super();
        this.attachShadow({mode:"open"});
        fetchTemplateHTML("/pages/users/user_content_component/index.html").then(componentHtml => {
            if(!this.shadowRoot)return;
            console.log({componentHtml}); // fetched componentHtml
            // const t = document.createDocumentFragment();
            const template = document.createElement("template");
            template.innerHTML = componentHtml;

            // // show in the gui
            this.shadowRoot.appendChild(template.content.cloneNode(true));
            console.log("add the init html");
            this.listSubAccounts();
        }).catch(error=>{
            console.log({error});
        });
    }
    listSubAccounts(){
        if(!this.shadowRoot){
            console.log("[class:UserContentComponent=>connectedCallback (fn:fetchTemplateHTML)]this.shadowRoot:",this.shadowRoot);return;
        }

        const subAccountsUl = this.shadowRoot.querySelector("#sub_account_ul");
        console.log({subAccountsUl});
        if(!subAccountsUl){
            console.log("[class:UserContentComponent=>connectedCallback (fn:fetchTemplateHTML)]subAccountsUl not found:",subAccountsUl);return;
        }
        fetchSubAccounts().then(subAccounts =>{
            
            // loop throught the sub accounts and then show them in the gui
            for(const subAcccount of subAccounts){
                const li = document.createElement("li");
                li.classList.add("sub_account_tile");
                const p1 = document.createElement("li");
                p1.textContent = String(subAcccount.sub_account_uid);
                p1.title = `sub_link_name: ${subAcccount.sub_link_name}`;
                li.appendChild(p1);
                subAccountsUl.appendChild(li);
            }
        }).catch(error=>{
            console.log({error});
        });

    }
    connectedCallback() {
        console.log("UserContentComponent connectedCallback");
        
       

     
    }
      
}


customElements.define("user-content-component",UserContentComponent);