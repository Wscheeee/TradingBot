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

        });
        // Fetcch the skeleton html and attach to dom

    }
    connectedCallback() {
        console.log("Custom square element added to page.");
     
    }
      
}


customElements.define("sidenav-component",Sidenav_Component);