const {BinanceScraper,createPuppeteerBrowser} = require("../../Binance_Scraper");
const {TraderInfo_Interface} = require("../../Binance_Scraper/BinanceScraper");
const {MongoDatabase} = require("../../MongoDatabase");
const {sleepAsync} = require("../../Utils/sleepAsync");


/**
 * 
 * @param {{mongoDatabase:MongoDatabase,binanceScraper:BinanceScraper}} args
 */
module.exports.positionsHandler = async function positionsHandler({mongoDatabase,binanceScraper}){
    try{
        console.log("fn[positionsHandler]")
        const followedTradersCursor = await mongoDatabase.collection.topTradersCollection.getAllFollowedTraders();
        // const followedTradersCursor = await mongoDatabase.collection.topTradersCollection.getAllDocuments();
        /**
         * 2. Loop through the traders and their info and save or edit the required;
         */
        while(await followedTradersCursor.hasNext()){
            const savedTraderDbDoc = await followedTradersCursor.next();
            const traderPositions = await binanceScraper.getOtherPosition(binanceScraper.globalPage,{encryptedUid:savedTraderDbDoc.uid,tradeType:"PERPETUAL"});
            //::## WORK ON POSITIONS
            const savedPositionsDbDocCursor = await mongoDatabase.collection.openTradesCollection.getDocumentsByTraderUid(savedTraderDbDoc.uid);
            // const savedTraderPositions = await savedPositionsDbDocCursor.toArray();


            while(await savedPositionsDbDocCursor.hasNext()){
                const savedPosition_ = await savedPositionsDbDocCursor.next();
                const openPositionInDbIsStillInTradersPositions = traderPositions.find(p => (
                    savedPosition_.pair===position_.symbol &&
                    savedPosition_.direction===position_.direction &&
                    savedPosition_.leverage===position_.leverage));

                if(!openPositionInDbIsStillInTradersPositions){// open position in Db is not in traders position any more
                    // position has been closed
                    // move from openTradesCollection to oldTrades
                    const positionToClose_ = savedPosition_;
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
                }else {
                    // position is still open
                    // check if position has been partially closed.
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

                    // update the positions incase it was edited
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
           
            
        };

        return;
    }catch(e){
        throw e;
        
    }

}

