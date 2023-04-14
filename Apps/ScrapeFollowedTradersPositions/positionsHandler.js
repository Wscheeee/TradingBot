const {DecimalMath} = require("../../DecimalMath/DecimalMath");


/**
 * 
 * @param {{
 *      mongoDatabase:import("../../MongoDatabase").MongoDatabase,
 *      binanceScraper:import("../../Binance_Scraper").BinanceScraper
 *  }} args
 */
module.exports.positionsHandler = async function positionsHandler({mongoDatabase,binanceScraper}){
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
                    let currentPositionsTotalParts = savedPosition_.total_parts;
                    if(isPositionRunning){
                        if(savedPosition_.size > position_.amount){
                            currentPositionsTotalParts = savedPosition_.total_parts+1;
                            // means that a partial position was closed
                            await mongoDatabase.collection.oldTradesCollection.createNewDocument({
                                original_position_id: savedPosition_._id,
                                close_datetime: new Date(),
                                direction:savedPosition_.direction,
                                entry_price: savedPosition_.entry_price,
                                followed: savedPosition_.followed,
                                copied: savedPosition_.copied,
                                leverage: savedPosition_.leverage,
                                mark_price: savedPosition_.mark_price,
                                open_datetime: savedPosition_.open_datetime,
                                original_size: savedPosition_.original_size,
                                pair:savedPosition_.pair,
                                part: savedPosition_.total_parts,
                                pnl: new DecimalMath(savedPosition_.pnl).subtract(position_.pnl).getResult(),
                                roi: new DecimalMath(Math.abs(savedPosition_.roi)).subtract(Math.abs(position_.roe)).getResult(),
                                size: new DecimalMath(savedPosition_.size).subtract(position_.amount).getResult(),
                                status: "CLOSED",
                                total_parts: currentPositionsTotalParts,
                                trader_id: savedPosition_.trader_id,
                                trader_uid: savedPosition_.trader_uid,
                                document_created_at_datetime: savedPosition_.document_created_at_datetime,
                                document_last_edited_at_datetime: new Date(),
                                server_timezone: process.env.TZ
                            });
                            const currentOpenPositionNewSize = new DecimalMath(savedPosition_.size).subtract(new DecimalMath(savedPosition_.size).subtract(position_.amount).getResult());
                            // adjust the open position to partial closed
                            await mongoDatabase.collection.openTradesCollection.updateDocument(savedPosition_._id,{
                                size: currentOpenPositionNewSize,
                                document_last_edited_at_datetime: new Date(),
                                total_parts: currentPositionsTotalParts
                            });
                        }

                    }
                    // if(savedPosition_.size<position_.amount){
                    // means that a size was added :: might happen even when posiition is not running
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
                        original_size: savedPosition_.original_size,
                        pair: savedPosition_.pair,
                        part: savedPosition_.part,
                        pnl:position_.pnl,
                        roi: position_.roe,
                        size: position_.amount,
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
                    close_datetime: new Date(),
                    direction: position_.direction,
                    entry_price: position_.entryPrice,
                    followed: savedTraderDbDoc && savedTraderDbDoc.followed?true:false,
                    copied: savedTraderDbDoc && savedTraderDbDoc.copied?true:false,
                    leverage: position_.leverage,
                    mark_price: position_.markPrice,
                    open_datetime: new Date(position_.updateTimeStamp),
                    original_size: position_.amount,
                    pair: position_.symbol,
                    part:0,
                    pnl:position_.pnl,
                    roi: position_.roe,
                    size: position_.amount,
                    status: "OPEN",
                    total_parts: 1,
                    document_created_at_datetime: datetimeNow,
                    document_last_edited_at_datetime: datetimeNow,
                    server_timezone: process.env.TZ
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
            // loop through the closed positions and close them andd delete them from openPositions collection
            for(const positionToClose_ of positionsToClose){
                await mongoDatabase.collection.oldTradesCollection.createNewDocument({
                    original_position_id: positionToClose_._id,
                    close_datetime: new Date(),
                    direction:positionToClose_.direction,
                    entry_price: positionToClose_.entry_price,
                    followed: positionToClose_.followed,
                    copied: positionToClose_.copied,
                    leverage: positionToClose_.leverage,
                    mark_price: positionToClose_.mark_price,
                    open_datetime: positionToClose_.open_datetime,
                    original_size: positionToClose_.original_size,
                    pair:positionToClose_.pair,
                    part: positionToClose_.part,
                    pnl: positionToClose_.pnl,
                    roi: positionToClose_.roi,
                    size: positionToClose_.size,
                    status: "CLOSED",
                    total_parts: positionToClose_.total_parts,
                    trader_id: positionToClose_.trader_id,
                    trader_uid: positionToClose_.trader_uid ,
                    
                });
                // delete from openPositions collections
                await mongoDatabase.collection.openTradesCollection.deleteManyDocumentsByIds([positionToClose_._id]);
            }
        }
        

    }
};

