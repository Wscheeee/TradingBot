"use-strict";
//@ts-check

/**
 * 
 * @param {{
 *      binance:import("../../Binance_Scraper").BinanceScraper,
 *      mongoDatabase:import("../../MongoDatabase").MongoDatabase
 * }} param0 
 * @param {import("../../Binance_Scraper/getLeaderboardRank_API").GetOtherLeaderboardBaseInfo_API_Payload_Interface}  getOtherPerformance_API_Payload_Interface
 */
module.exports.leaderboardTradersAndStatsHandler = async function leaderboardTradersAndStatsHandler({binance,mongoDatabase},getOtherPerformance_API_Payload_Interface){
    const binanceTradersAndTheirInfo = await binance.getTradersTheirInfoStatistics(binance.globalPage,getOtherPerformance_API_Payload_Interface);

    /**
     * 2. Loop through the traders and their info and save or edit the required;
     */
    for(const binanceTraderInfo of binanceTradersAndTheirInfo){
        const {performance:traderPerformance,trader} = binanceTraderInfo;
       

        //a. save trader to db if not already saved
        const savedTrader = await mongoDatabase.collection.topTradersCollection.getDocumentByTraderUid(trader.encryptedUid);
        console.log({savedTrader,username:trader.toJson()});

        if(!savedTrader){
            //trader in db not found
            // create in db
            mongoDatabase.collection.topTradersCollection.createNewDocument({
                username: trader.nickName,
                uid: trader.encryptedUid,
                copied: false,
                followed: false,
                document_last_edited_at_datetime: new Date(),
                performances_last_uptade_datetime: new Date(),
                document_created_at_datetime: new Date(),
                all_pnl: 
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"ALL",
                                statisticsType:"PNL"
                            }
                        ),
                all_roi: 
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"ALL",
                                statisticsType:"ROI"
                            }
                        ),
                daily_pnl: 
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"DAILY",
                                statisticsType:"PNL"
                            }
                        ),
                daily_roi: 
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"DAILY",
                                statisticsType:"ROI"
                            }
                        ),
                weekly_pnl:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"WEEKLY",
                                statisticsType:"PNL"
                            }
                        ),
                weekly_roi:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"WEEKLY",
                                statisticsType:"ROI"
                            }
                        ),
                monthly_pnl:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"MONTHLY",
                                statisticsType:"PNL"
                            }
                        ),
                monthly_roi:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"MONTHLY",
                                statisticsType:"ROI"
                            }
                        ),
                yearly_pnl:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"YEARLY",
                                statisticsType:"PNL"
                            }
                        ),
                yearly_roi:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"YEARLY",
                                statisticsType:"ROI"
                            }
                        ),
                // exacts
                exact_weekly_pnl:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"EXACT_WEEKLY",
                                statisticsType:"PNL"
                            }
                        ),
                exact_weekly_roi:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"EXACT_WEEKLY",
                                statisticsType:"ROI"
                            }
                        ),
                exact_monthly_pnl:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"EXACT_MONTHLY",
                                statisticsType:"PNL"
                            }
                        ),
                exact_monthly_roi:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"EXACT_MONTHLY",
                                statisticsType:"ROI"
                            }
                        ),
                exact_yearly_pnl:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"EXACT_YEARLY",
                                statisticsType:"PNL"
                            }
                        ),
                exact_yearly_roi:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"EXACT_YEARLY",
                                statisticsType:"ROI"
                            }
                        ),
                
            });
        }else {
            // trader is available // needs update
            await mongoDatabase.collection.topTradersCollection.updateDocument(savedTrader._id,{
                username: trader.nickName,
                uid: trader.encryptedUid,
                copied: savedTrader.copied,
                followed: savedTrader.followed,
                document_last_edited_at_datetime:new Date(),
                performances_last_uptade_datetime: new Date(),
                all_pnl: 
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"ALL",
                                statisticsType:"PNL"
                            },
                            savedTrader.allPNL
                        ),
                all_roi: 
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"ALL",
                                statisticsType:"ROI"
                            },
                            savedTrader.allROI
                        ),
                daily_pnl: 
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"DAILY",
                                statisticsType:"PNL"
                            },
                            savedTrader.dailyPNL
                        ),
                daily_roi: 
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"DAILY",
                                statisticsType:"ROI"
                            },
                            savedTrader.dailyROI
                        ),
                weekly_pnl:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"WEEKLY",
                                statisticsType:"PNL"
                            },
                            savedTrader.weeklyPNL
                        ),
                weekly_roi:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"WEEKLY",
                                statisticsType:"ROI"
                            },
                            savedTrader.weeklyROI
                        ),
                monthly_pnl:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"MONTHLY",
                                statisticsType:"PNL"
                            },
                            savedTrader.monthlyPNL
                        ),
                monthly_roi:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"MONTHLY",
                                statisticsType:"ROI"
                            },
                            savedTrader.monthlyROI
                        ),
                yearly_pnl:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"YEARLY",
                                statisticsType:"PNL"
                            },
                            savedTrader.yearlyPNL
                        ),
                yearly_roi:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"YEARLY",
                                statisticsType:"ROI"
                            },
                            savedTrader.yearlyROI
                        ),
                // exacts
                exact_weekly_pnl:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"EXACT_WEEKLY",
                                statisticsType:"PNL"
                            },
                            savedTrader.exactWeeklyPNL
                        ),
                exact_weekly_roi:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"EXACT_WEEKLY",
                                statisticsType:"ROI"
                            },
                            savedTrader.exactWeeklyROI
                        ),
                exact_monthly_pnl:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"EXACT_MONTHLY",
                                statisticsType:"PNL"
                            },
                            savedTrader.exactMonthlyPNL
                        ),
                exact_monthly_roi:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"EXACT_MONTHLY",
                                statisticsType:"ROI"
                            },
                            savedTrader.exactMonthlyROI
                        ),
                exact_yearly_pnl:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"EXACT_YEARLY",
                                statisticsType:"PNL"
                            },
                            savedTrader.exactYearlyPNL
                        ),
                exact_yearly_roi:
                    binance.
                        utils.
                        traderPerformance.
                        getValueForPerformance(
                            traderPerformance,
                            {
                                periodType:"EXACT_YEARLY",
                                statisticsType:"ROI"
                            },
                            savedTrader.exactYearlyROI
                        ),
            });
        }
        // :: At this area a doc has been inserted
        
        

    }
    return;
};