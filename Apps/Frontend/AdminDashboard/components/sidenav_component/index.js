//@ts-check

class Sidenav_Component extends HTMLElement {
    constructor(){
        super();
        this.attachShadow({mode:"open"});
        const template = document.createElement("template");
        fetchTemplateHTML("/components/sidenav_component/index.html").then((html)=>{
            if(!this.shadowRoot){
                console.log("[class:Sidenav_Component=>constructor (fn:fetchTemplateHTML)]this.shadowRoot is ",this.shadowRoot);
                return; 
            }
            console.log({html});
            template.innerHTML = html;
            this.shadowRoot.appendChild(template.content.cloneNode(true));

            // Activate nav clicks
            const nav_items = this.shadowRoot.querySelectorAll(".nav-item");
            nav_items.forEach((navItem)=>{
                navItem.addEventListener("click",()=>{
                    // If cliccked remove .active class from the one that had it previously and add to this elem
                    nav_items.forEach((elem2)=>{
                        if(elem2.classList.contains("active")){
                            elem2.classList.remove("active");
                        }
                    });
                    navItem.classList.add("active");

                    const textContent = navItem.textContent;

                    // Dispatch navigation event
                    if(textContent){
                        // format it to page folder name
                        const pageUid = textContent.toLowerCase().split(" ").join("-");
                        appStore.dispatchSelectedNavigationPage(pageUid);
                    }
                });
            });

        });
        // Fetcch the skeleton html and attach to dom

    }
    connectedCallback() {
        console.log("Custom square element added to page.");
     
    }
      
}


customElements.define("sidenav-component",Sidenav_Component);