const template_AppContent = document.createElement("template");
template_AppContent.innerHTML = `
    <style>
        .sidebar {
            background-color:#121212;
            width: 10em;
            height: 100vh;
            color: white;
            padding: 10px 0px;
        }
        .nav-item {
            background-color: white;
            width: 100%;
            color: black;
            cursor: pointer;
            padding: 10px;
        }
    </style>
    <div class="sidebar">
        <div class="nav-item">Users</div>
    </div>
`;

class AppContent extends HTMLElement {
    constructor(){
        super();
        this.attachShadow({mode:"open"});
        this.shadowRoot.appendChild(template_AppContent.content.cloneNode(true));
    }
    connectedCallback() {
        console.log("Custom square element added to page.");
     
    }
      
}


customElements.define("sp-content",AppContent);