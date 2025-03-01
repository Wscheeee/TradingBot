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

    // TopTraders
    /**
     * @typedef {(selectedTopTrader:import("../../../../API_AdminDashboard/routes/top_traders/types").TopTrader_Interface)=>any} TopTraderSelectionlisteners_Callback
     */
    /**
     * @type {TopTraderSelectionlisteners_Callback[]}
     */
    #topTraderSelectionlisteners = [];

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

    /**
     * @typedef {(pageUid:string)=>any} NavigationPageListenerCallback_Interface
     * @type {NavigationPageListenerCallback_Interface[]}
     */
    #navigationPageListeners = [];

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

    // Users Page
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

    // Top Tradders Page
    /**
     * 
     * @param {TopTraderSelectionlisteners_Callback} topTradersSelectionlisteners_Callback 
     */
    listenToTopTraderClick_InTopTradersList(topTradersSelectionlisteners_Callback){
        console.log("(method:listenToTopTraderClick_InTopTradersList)");
        this.#topTraderSelectionlisteners.push(topTradersSelectionlisteners_Callback);
       
    }

    /**
     * 
     * @param {import("../../../../API_AdminDashboard/routes/top_traders/types").TopTrader_Interface} clickedTopTrader 
     */
    dispatchActionForSelectTopTrader_InTopTradersList(clickedTopTrader){
        this.#dispatch("selectedTopTrader",clickedTopTrader);
        this.#topTraderSelectionlisteners.forEach((cb)=>{
            cb(clickedTopTrader);
        });
    }

    // TABLES
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

    // PAGES
    /**
     * @param {string} pageUid 
     */
    dispatchSelectedNavigationPage(pageUid){
        console.log("(method:dispatchSelectedNavigationPage)");
        console.log({pageUid});
        this.#dispatch("page",pageUid);
        const listeners = this.#navigationPageListeners;
        if(listeners ){
            listeners.forEach(cb=>{
                cb(pageUid);
            });
        }
    }

    /**
     * 
     * @param {NavigationPageListenerCallback_Interface} cb 
     */
    listenToPageSelectionNavigationDispatch(cb){
        this.#navigationPageListeners.push(cb);
    }
}

const appStore = new AppStore();

// module.exports.appStore = appStore;