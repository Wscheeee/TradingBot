//@ts-check
/**
 * Update on:
 * : Position size increase
 * : Position size decrease : Partial close
 * : Leverage change
 * : Update other values e.g Markprice and roe
 */
const {DecimalMath} = require("../../Math/DecimalMath");
const { sleepAsync} = require("../../Utils/sleepAsync");

const {calculateRoiFromPosition} = require("./calculateRoiFromPosition");
const {calculatePnlFromPosition} = require("./calculatePnlFromPosition");

/**
 *  
 * @param {{
 *      mongoDatabase:import("../../MongoDatabase").MongoDatabase,
 *      binanceScraper:import("../../Binance_Scraper").BinanceScraper
 *  }} args
 */
module.exports.positionsHandler = async function positionsHandler({mongoDatabase,binanceScraper}){
    const FUNCTION_NAME="(fn:positionsHandler)";
    try{
        const followedTradersCursor = await mongoDatabase.collection.topTradersCollection.getAllFollowedTraders();
        const subAccountConfigCursor = await mongoDatabase.collection.subAccountsConfigCollection.getAllDocuments();
        const subAccountConfig_Array = await subAccountConfigCursor.toArray();
        const uidsOfTradersInSubAccountConfigCollection_Array = subAccountConfig_Array.map((config)=>config.trader_uid);
        /**
         * 2. Loop through the traders and their info and save or edit the required;
         */
        while(await followedTradersCursor.hasNext()){
            const savedTraderDbDoc = await followedTradersCursor.next();
            if(!savedTraderDbDoc)return;
            await sleepAsync(1000);
            const traderPositions = await binanceScraper.getOtherPosition(binanceScraper.globalPage,{encryptedUid:savedTraderDbDoc.uid,tradeType:"PERPETUAL"});
            //::## WORK ON POSITIONS
            const savedPositionsDbDocCursor = await mongoDatabase.collection.openTradesCollection.getDocumentsByTraderUid(savedTraderDbDoc.uid);
            const savedTraderPositions = await savedPositionsDbDocCursor.toArray();
            for(const position_ of traderPositions){
                let positionIsSaved = false;
                for(const savedPosition_ of savedTraderPositions){
                    //:: Check if position is saved
                    if(
                        savedPosition_.pair===position_.symbol &&
                        savedPosition_.direction===position_.direction
                        //  &&
                        // savedPosition_.leverage===position_.leverage
                    ){
                        positionIsSaved = true;
    
                        // Found similar positions 
                        const isPositionRunning = position_.pnl !== savedPosition_.pnl;
                        let currentPositionsTotalParts = savedPosition_.total_parts;
                        if(isPositionRunning){
                            if(savedPosition_.size > position_.amount){// A partial was closed
                                currentPositionsTotalParts = savedPosition_.total_parts+1;
                                // means that a partial position was closed
                                const partialPositionsSize = new DecimalMath(Math.abs(savedPosition_.size)).subtract(Math.abs(position_.amount)).getResult();
                                const roi = calculateRoiFromPosition({
                                    close_price: savedPosition_.mark_price,
                                    entry_price: savedPosition_.entry_price,
                                    leverage: savedPosition_.leverage,
                                    direction: savedPosition_.direction

                                });
                                await mongoDatabase.collection.oldTradesCollection.createNewDocument({
                                    original_position_id: savedPosition_._id,
                                    close_datetime: new Date(),
                                    direction:savedPosition_.direction,
                                    entry_price: savedPosition_.entry_price,
                                    close_price: savedPosition_.mark_price,
                                    followed: savedPosition_.followed,
                                    copied: savedPosition_.copied,
                                    leverage: savedPosition_.leverage,
                                    mark_price: savedPosition_.mark_price,
                                    open_datetime: savedPosition_.open_datetime,
                                    original_size: savedPosition_.original_size,
                                    pair:savedPosition_.pair,
                                    part: savedPosition_.total_parts,
                                    pnl: calculatePnlFromPosition({
                                        roi: roi,
                                        entry_price: savedPosition_.entry_price,
                                        size: partialPositionsSize,
                                        leverage: savedPosition_.leverage
                                    }),
                                    roi: roi,
                                    size: partialPositionsSize,
                                    previous_size_before_partial_close: savedPosition_.size,
                                    status: "CLOSED",
                                    total_parts: currentPositionsTotalParts,
                                    trader_id: savedPosition_.trader_id,
                                    trader_uid: savedPosition_.trader_uid,
                                    trader_username:savedPosition_.trader_username,
                                    trader_today_estimated_balance: savedPosition_.trader_today_estimated_balance,
                                    reason:"TRADER_CLOSED_THIS_POSITION",
                                    document_created_at_datetime: savedPosition_.document_created_at_datetime,
                                    document_last_edited_at_datetime: new Date(),
                                    //@ts-ignore
                                    server_timezone: process.env.TZ
                                });
                                const currentOpenPositionNewSize = new DecimalMath(savedPosition_.size).subtract(new DecimalMath(savedPosition_.size).subtract(position_.amount).getResult()).getResult();
                                // adjust the open position to partial closed
                                await mongoDatabase.collection.openTradesCollection.updateDocument(savedPosition_._id,{
                                    size: currentOpenPositionNewSize,
                                    previous_size_before_partial_close: savedPosition_.size,
                                    document_last_edited_at_datetime: new Date(),
                                    total_parts: currentPositionsTotalParts,
    
                                });
                            }else if(savedPosition_.size < position_.amount){// The size was increased
                                // so update the position 
                                await mongoDatabase.collection.openTradesCollection.updateDocument(savedPosition_._id,{
                                    size: position_.amount,
                                    previous_size_before_partial_close: position_.amount,
                                });
                                    
                            }else { // size did not change
                                console.log("Size did not change");
                            }
    
                            // Check for leverage change
                            if(savedPosition_.leverage!=position_.leverage){
                                // update leverage incase of change
                                await mongoDatabase.collection.openTradesCollection.updateDocument(savedPosition_._id,{
                                    leverage: savedPosition_.leverage,
                                });
                            }
    
                            // Update other details
    
                            await mongoDatabase.collection.openTradesCollection.updateDocument(savedPosition_._id,{
                                mark_price: position_.markPrice,
                                document_last_edited_at_datetime: new Date(),
                                server_timezone: process.env.TZ
                            });
    
                        }// End of isPositionRunning
     
                        // if(savedPosition_.size<position_.amount){
                        // means that a size was added :: might happen even when position is not running
                        // update even if nothing changed
                        // so update the position 
                        await mongoDatabase.collection.openTradesCollection.updateDocument(savedPosition_._id,{
                            trader_id: savedPosition_.trader_id,
                            trader_uid: savedPosition_.trader_uid,
                            // close_datetime: null,
                            direction: savedPosition_.direction,
                            entry_price: position_.entryPrice,
                            followed: savedPosition_.followed,
                            copied: savedPosition_.copied,
                            leverage: savedPosition_.leverage,
                            mark_price: position_.markPrice,
                            open_datetime: savedPosition_.open_datetime,
                            original_size: savedPosition_.original_size<position_.amount?position_.amount:savedPosition_.original_size, // Adjust original size incase of size increase
                            pair: savedPosition_.pair,
                            part: savedPosition_.part,
                            size: position_.amount,
                            previous_size_before_partial_close: (position_.amount!=savedPosition_.size?position_.amount:savedPosition_.previous_size_before_partial_close),
                            status: savedPosition_.status,
                            total_parts: currentPositionsTotalParts,
                            document_created_at_datetime: savedPosition_.document_created_at_datetime,
                            document_last_edited_at_datetime: new Date(),
                            server_timezone: process.env.TZ
                        });
                            
                        
                    }
                }
                if(positionIsSaved===false){
                    // save position for the first time
                    const datetimeNow = new Date();
                    await mongoDatabase.collection.openTradesCollection.createNewDocument({
                        trader_id: savedTraderDbDoc._id,
                        trader_uid: savedTraderDbDoc.uid, 
                        trader_username: savedTraderDbDoc.username,
                        trader_today_estimated_balance: savedTraderDbDoc.today_estimated_balance?savedTraderDbDoc.today_estimated_balance:0,
                        direction: position_.direction,
                        pnl:0,
                        roi:0,
                        entry_price: position_.entryPrice,
                        followed: savedTraderDbDoc && savedTraderDbDoc.followed?true:false,
                        // copied: savedTraderDbDoc && savedTraderDbDoc.copied?true:false,
                        copied: uidsOfTradersInSubAccountConfigCollection_Array.includes(savedTraderDbDoc.uid)?true:false,
                        leverage: position_.leverage,
                        mark_price: position_.markPrice,
                        open_datetime: new Date(position_.updateTimeStamp),
                        original_size: position_.amount,
                        pair: position_.symbol,
                        part:0,
                        size: position_.amount,
                        previous_size_before_partial_close: position_.amount,
                        status: "OPEN",
                        total_parts: 1,
                        document_created_at_datetime: datetimeNow,
                        document_last_edited_at_datetime: datetimeNow,
                        server_timezone: process.env.TZ||""
                    });
                }
                
            }
            
            // Catch closed positions
            if(savedTraderPositions.length>traderPositions.length ){
                //means that some positions were closed.
                // chheck which ones and close
                /**
                 * @type {import("../../MongoDatabase/collections/open_trades/types").OpenTrades_Collection_Document_Interface[]}
                 */
                const positionsToClose = [];
                for(const savedPosition_ of savedTraderPositions){
                    let positionStillOpen = false;
                    for(const openPosition_ of traderPositions){
                        if(
                            savedPosition_.pair===openPosition_.symbol &&
                            savedPosition_.direction===openPosition_.direction &&
                            savedPosition_.leverage===openPosition_.leverage
                        ){
                            positionStillOpen = true;
                        }
                    }
                    if(positionStillOpen===false){
                        positionsToClose.push(savedPosition_);
                    } 
                }
                // loop through the closed positions and close them and delete them from openPositions collection
                for(const positionToClose_ of positionsToClose){
                    const datetimeNow = new Date();
                    const roi = calculateRoiFromPosition({
                        close_price: positionToClose_.mark_price,
                        entry_price: positionToClose_.entry_price,
                        leverage: positionToClose_.leverage,
                        direction: positionToClose_.direction
                    });
                    await mongoDatabase.collection.oldTradesCollection.createNewDocument({
                        original_position_id: positionToClose_._id,
                        close_datetime: new Date(),
                        direction:positionToClose_.direction,
                        entry_price: positionToClose_.entry_price,
                        close_price: positionToClose_.mark_price, 
                        followed: positionToClose_.followed,
                        copied: positionToClose_.copied,
                        leverage: positionToClose_.leverage,
                        mark_price: positionToClose_.mark_price,
                        open_datetime: positionToClose_.open_datetime,
                        original_size: positionToClose_.original_size,
                        pair:positionToClose_.pair,
                        part: positionToClose_.part,
                        pnl: calculatePnlFromPosition({
                            roi: roi,
                            entry_price: positionToClose_.entry_price,
                            size: positionToClose_.size,
                            leverage: positionToClose_.leverage
                        }),
                        roi: roi,
                        size: positionToClose_.size,
                        previous_size_before_partial_close: positionToClose_.previous_size_before_partial_close,
                        status: "CLOSED",
                        total_parts: positionToClose_.total_parts,
                        trader_id: positionToClose_.trader_id,
                        trader_uid: positionToClose_.trader_uid ,
                        trader_username: positionToClose_.trader_username,
                        trader_today_estimated_balance: positionToClose_.trader_today_estimated_balance,
                        document_created_at_datetime: datetimeNow,
                        document_last_edited_at_datetime: datetimeNow,
                        server_timezone: process.env.TZ||"",
                        reason: "TRADER_CLOSED_THIS_POSITION"
                    });
                    // delete from openPositions collections
                    await mongoDatabase.collection.openTradesCollection.deleteManyDocumentsByIds([positionToClose_._id]);
                }
            }
            
    
        }

    }catch(error){
        const newErrorMessage = `${FUNCTION_NAME}: ${error.message}`;
        error.message = newErrorMessage;
        throw error;
    }
};