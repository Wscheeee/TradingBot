//@ts-check

class Table_Component extends HTMLElement {
    static tableData = {
        headers: ["Symbol","Leverage","Quantity","Entry Price","Mark Price","Profit/Loss"],
        body:[
            {
                Symbol:"BTCUSDT",
                Leverage:"2x",
                Quantity:"2",
                entry_price:"0.0"
            }
        ]
    };
    constructor(){
        super();
        this.attachShadow({mode:"open"});
        const template = document.createElement("template");
        fetchTemplateHTML("/components/table_component/index.html").then((html)=>{
            if(!this.shadowRoot){
                console.log("[class:Table_Component=>constructor (fn:fetchTemplateHTML)]this.shadowRoot is ",this.shadowRoot);
                return;
            }
            console.log({html});
            template.innerHTML = html;
            this.shadowRoot.appendChild(template.content.cloneNode(true));
            
            
            // Create th s
            const uid = this.getAttribute("uid");
            if(!uid)throw new Error("pass uid in table attribute");
            this.fillTableWithTableDataInStore(uid);
            

            appStore.listenForTableDataEventsDispatch(uid,(tableData)=>{
                this.fillTableWithTableDataInStore(uid);
            });


        });
        // Fetcch the skeleton html and attach to dom

    }
    connectedCallback() {
        console.log("Custom square element added to page.");
     
    }


    /**
     * 
     * @param {string} tableUid 
     */
    fillTableWithTableDataInStore(tableUid){
        const tableData = appStore.getTableData(tableUid);
        console.log("tableData");
        console.log(tableData);
        if(!tableData){
            console.log("tableData is:"+tableData);
            return;
        }
        const tableHead = this.shadowRoot.querySelector(".table-container table thead");
        if(!tableHead){
            throw Error("tableHead is: "+tableHead);
            
        }
        const tableHeadTr = document.createElement("tr");
        tableData.headers.forEach((thData)=>{
            const th = document.createElement("th");
            th.textContent = String(thData);
            tableHeadTr.appendChild(th);
        });
        tableHead.appendChild(tableHeadTr);
        
        const tableBody = this.shadowRoot.querySelector(".table-container table tbody");
        if(!tableBody){
            throw Error("tableBody is: "+tableBody);
            
        }
        tableData.body.forEach(trData=>{
            const tableBodyTr = document.createElement("tr");
            trData.forEach((tdData)=>{
                const td = document.createElement("td");
                td.textContent = String(tdData);
                tableBodyTr.appendChild(td);
            });
            tableBody.appendChild(tableBodyTr);
        });
    }
      
}


customElements.define("table-component",Table_Component);