//@ts-check

class Loader_Component extends HTMLElement {
    constructor(){
        super();
        this.attachShadow({mode:"open"});
        const template = document.createElement("template");
        fetchTemplateHTML("/components/loader_component/index.html").then((html)=>{
            if(!this.shadowRoot){
                console.log("[class:Loader_Component=>constructor (fn:fetchTemplateHTML)]this.shadowRoot is ",this.shadowRoot);
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


customElements.define("loader-component",Loader_Component);