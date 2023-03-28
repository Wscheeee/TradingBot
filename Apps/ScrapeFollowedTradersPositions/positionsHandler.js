const {BinanceScraper,createPuppeteerBrowser} = require("../../Binance_Scraper");
const {TraderInfo_Interface} = require("../../Binance_Scraper/BinanceScraper");
const {MongoDatabase} = require("../../MongoDatabase");
const {sleepAsync} = require("../../Utils/sleepAsync");


/**
 * 
 * @param {{mongoDatabase:MongoDatabase,binanceScraper:BinanceScraper}} args
 */
module.exports.positionsHandler = async function positionsHandler({mongoDatabase,binanceScraper}){
// module.exports.positionsHandler = async function positionsHandler(binanceTradersAndTheirInfo,mongoDatabase){
    try{
        const followedTradersCursor = await mongoDatabase.collection.topTradersCollection.getAllFollowedTraders();
        /**
         * 2. Loop through the traders and their info and save or edit the required;
         */
        while(await followedTradersCursor.hasNext()){
            const savedTraderDbDoc = await followedTradersCursor.next();
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
                        savedPosition_.direction===position_.direction &&
                        savedPosition_.leverage===position_.leverage
                    ){
                        positionIsSaved = true;
    
                        // Found similar positions 
                        const isPositionRunning = position_.pnl !== savedPosition_.pnl;
                        if(isPositionRunning){
                            if(savedPosition_.size > position_.amount){
                                // means that a partial position was closed
                                await mongoDatabase.collection.oldTradesCollection.createNewDocument({
                                    original_position_id: savedPosition_._id,
                                    close_date: Date.now(),//binance.utils.closeNow().close_timestamp,
                                    direction:savedPosition_.direction,
                                    entry_price: savedPosition_.entry_price,
                                    followed: savedPosition_.followed,
                                    copied: savedPosition_.copied,
                                    leverage: savedPosition_.leverage,
                                    mark_price: savedPosition_.mark_price,
                                    open_date: savedPosition_.open_date,
                                    original_size: savedPosition_.original_size,
                                    pair:savedPosition_.pair,
                                    part: savedPosition_.part,
                                    pnl: savedPosition_.pnl - position_.pnl,
                                    roi: savedPosition_.roi - position_.roe,
                                    size: savedPosition_.size - position_.amount,
                                    status: "CLOSED",
                                    total_parts: savedPosition_.total_parts+1,
                                    trader_id: savedPosition_.trader_id,
                                    trader_uid: savedPosition_.trader_uid  
                                });
                                // adjust the open position to partial closed
                                await mongoDatabase.collection.openTradesCollection.updateDocument(savedPosition_._id,{
                                    size: savedPosition_.size - (savedPosition_.size - position_.amount),
                                    document_last_edited_at: Date.now(),
                                    total_parts: savedPosition_.total_parts+1
                                })
                            }else{};
    
                        }
                        // if(savedPosition_.size<position_.amount){
                            // means that a size was added :: might happen even when posiition is not running
                        if(true){// update even if nothing changed
                            // so update the position 
                            await mongoDatabase.collection.openTradesCollection.updateDocument(savedPosition_._id,{
                                trader_id: savedPosition_.trader_id,
                                trader_uid: savedPosition_.trader_uid,
                                close_date: null,
                                direction: savedPosition_.direction,
                                entry_price: position_.entryPrice,
                                followed: savedPosition_.followed,
                                copied: savedPosition_.copied,
                                leverage: savedPosition_.leverage,
                                mark_price: position_.markPrice,
                                open_date: position_.updateTimeStamp,
                                original_size: savedPosition_.original_size,
                                pair: savedPosition_.pair,
                                part: savedPosition_.part,
                                pnl:position_.pnl,
                                roi: position_.roe,
                                size: position_.amount,
                                status: savedPosition_.status,
                                total_parts: savedPosition_.total_parts,
                                document_created_at: savedPosition_.document_created_at,
                                document_last_edited_at: Date.now(),
                                server_timezone: process.env.TZ
                            })
                            
                        }
                    }
                }
                if(positionIsSaved===false){
                    // save position for the first time
                    await mongoDatabase.collection.openTradesCollection.createNewDocument({
                        trader_id: savedTraderDbDoc._id,
                        trader_uid: savedTraderDbDoc.uid,
                        close_date: null,
                        direction: position_.direction,
                        entry_price: position_.entryPrice,
                        followed: savedTraderDbDoc && savedTraderDbDoc.followed?true:false,
                        copied: savedTraderDbDoc && savedTraderDbDoc.copied?true:false,
                        leverage: position_.leverage,
                        mark_price: position_.markPrice,
                        open_date: position_.updateTimeStamp,
                        original_size: position_.amount,
                        pair: position_.symbol,
                        part:0,
                        pnl:position_.pnl,
                        roi: position_.roe,
                        size: position_.amount,
                        status: "OPEN",
                        total_parts: 1,
                        document_created_at: Date.now(),
                        document_last_edited_at: Date.now(),
                        server_timezone: process.env.TZ
                    })
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
                    };
                    if(positionStillOpen===false){
                        positionsToClose.push(savedPosition_)
                    }
                };
                // loop through the closed positions and close them andd delete them from openPositions collection
                for(const positionToClose_ of positionsToClose){
                    await mongoDatabase.collection.oldTradesCollection.createNewDocument({
                        original_position_id: positionToClose_._id,
                        close_date: Date.now(),//binance.utils.closeNow().close_timestamp,
                        direction:positionToClose_.direction,
                        entry_price: positionToClose_.entry_price,
                        followed: positionToClose_.followed,
                        copied: positionToClose_.copied,
                        leverage: positionToClose_.leverage,
                        mark_price: positionToClose_.mark_price,
                        open_date: positionToClose_.open_date,
                        original_size: positionToClose_.original_size,
                        pair:positionToClose_.pair,
                        part: positionToClose_.part,
                        pnl: positionToClose_.pnl,
                        roi: positionToClose_.roi,
                        size: positionToClose_.size,
                        status: "CLOSED",
                        total_parts: positionToClose_.total_parts,
                        trader_id: positionToClose_.trader_id,
                        trader_uid: positionToClose_.trader_uid  
                    });
                    // delete from openPositions collections
                    await mongoDatabase.collection.openTradesCollection.deleteManyDocumentsByIds([positionToClose_._id])
                }
            }
            

        };

        return;
    }catch(e){
        throw e;
        
    }

}

