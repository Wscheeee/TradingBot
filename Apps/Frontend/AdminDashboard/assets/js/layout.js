//@ts-check
document.addEventListener("DOMContentLoaded",()=>{
    /**
     * 
     */
    /**
     * @type {{[pageId:string]:{
     *      list_layout: string,
     *      content_layout: string 
     *  }}}
     */
    const pageUidToHtmlObject = {
        "users": {
            content_layout: "user-content-component",
            list_layout:"users-list-component"
        }
    };
    // Layouts
    const side_nav_bar_layout = document.querySelector("#side_nav_bar_layout");
    const list_layout = document.querySelector("#list_layout");
    const content_layout = document.querySelector("#content_layout");
    console.log({
        list_layout,
        content_layout
    });
    appStore.listenToPageSelectionNavigationDispatch((pageUid)=>{
        console.log("(fn:listenToPageSelectionNavigationDispatch)");
        // alert(pageUid);
        // Set the respective html in ttheir respective layouts
        const listComponentTemplateName = `${pageUid}-list-component`;
        const contentComponentTemplateName = `${pageUid}-content-component`;

        if(list_layout){
            const l = document.createElement(listComponentTemplateName);
            list_layout.innerHTML = "";
            list_layout.appendChild(l);
        }
        if(content_layout){
            const c = document.createElement(contentComponentTemplateName);
            content_layout.innerHTML = "";
            content_layout.appendChild(c);
        }
    
    });

});