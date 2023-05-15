const template2 = document.createElement("template");
template2.innerHTML = `
    <style>
        .topnav {
            background-color:#121212;
            width: 30em;
            height: 100vh;
            color: white;
            padding: 10px 10px;
        }
        .nav-item {
            background-color: white;
            width: 100%;
            color: black;
            cursor: pointer;
            padding: 10px;
        }
    </style>
    <div class="topnav">
        <div class="user">User</div>
    </div>
`;

class AppListbar extends HTMLElement {
    constructor(){
        super();
        this.attachShadow({mode:"open"});
        this.shadowRoot.appendChild(template2.content.cloneNode(true));
    }
    connectedCallback() {
        console.log("Custom square element added to page.");
     
    }
      
}


customElements.define("s-listbar",AppListbar);