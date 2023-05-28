//@ts-check
class AppStore {
    APP_STORE_DATA_KEY="APP_STORE_DATA_KEY";
    data = {

    };
    // Listeners
    /**
     * @typedef {(selectedUser:import("../../../../API_AdminDashboard/routes/users/types").User_Interface)=>any} UserSelectionlisteners_Callback
     */
    /**
     * @type {UserSelectionlisteners_Callback[]}
     */
    #userSelectionlisteners = [];

    /**
     * @typedef {{
     *      headers: string[],
     *      body: string[][]
     * }} TableData_Interface
     * @typedef {(tableData:TableData_Interface)=>any} TableDataListenerCb
     * @typedef {{
     *   [tableId:string]: TableDataListenerCb[]
     * }} TableDataEventDispatchlisteners_Callback
     */
    /**
     * @type {TableDataEventDispatchlisteners_Callback}
     */
    #tableDataEventsDispatchlisteners_Object= {};
    constructor(){
        // Retrieve data from storage
        const appDataFromLocalStorage = localStorage.getItem(this.APP_STORE_DATA_KEY);
        if(appDataFromLocalStorage){
            this.data = JSON.parse(appDataFromLocalStorage);
        }
    }

    #dispatch(eventName,eventPayload){
        console.log("(method:Dispatch)");
        console.log({
            eventName,eventPayload
        });
        this.data[eventName] = {
            ...this.data[eventName],
            ...eventPayload,
            current_page_path: location.pathname
        };
        // save the data obj in storage
        localStorage.setItem("app-store-data",JSON.stringify(this.data));
    }

    /**
     * 
     * @param {UserSelectionlisteners_Callback} userSelectionlisteners_Callback 
     */
    listenToUserClick_InUsersList(userSelectionlisteners_Callback){
        console.log("(method:listenToUserClick_InUsersList)");
        this.#userSelectionlisteners.push(userSelectionlisteners_Callback);
       
    }

    /**
     * 
     * @param {import("../../../../API_AdminDashboard/routes/users/types").User_Interface} clickedUser 
     */
    dispatchActionForSelectUser_InUsersList(clickedUser){
        this.#dispatch("selectedUser",clickedUser);
        this.#userSelectionlisteners.forEach((cb)=>{
            cb(clickedUser);
        });
    }

    
    /**
     * @param {string} tableId
     * @param {TableDataListenerCb} tableDataEventDispatchlisteners_Callback
     */
    listenForTableDataEventsDispatch(tableId,tableDataEventDispatchlisteners_Callback){
        console.log("(method:listenForTableDataEventsDispatch)");
        if(!this.#tableDataEventsDispatchlisteners_Object[tableId]){
            this.#tableDataEventsDispatchlisteners_Object[tableId] = [tableDataEventDispatchlisteners_Callback];
        }else {
            this.#tableDataEventsDispatchlisteners_Object[tableId].push(tableDataEventDispatchlisteners_Callback);
        }
    }

    /**
     * 
     * @param {string} tableId 
     * @param {TableData_Interface} tableData 
     */
    dispatchTableData(tableId,tableData){
        console.log("(method:dispatchTableData)");
        console.log({tableData});
        this.#dispatch(tableId,tableData);
        const listeners = this.#tableDataEventsDispatchlisteners_Object[tableId];
        if(listeners ){
            listeners.forEach(cb=>{
                cb(tableData);
            });
        }
    }
    /**
     * 
     * @param {string} tableUid 
     * @returns {TableData_Interface}
     */
    getTableData(tableUid){
        console.log("(method:getTableData) tableuid: "+tableUid);
        console.log("store data");
        console.log(this.data);
        const tableData = this.data[tableUid];
        console.log("tableData");
        console.log(tableData);
        return tableData;
    }

}

const appStore = new AppStore();

// module.exports.appStore = appStore;