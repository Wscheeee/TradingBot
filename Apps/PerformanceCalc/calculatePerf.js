const { DateTime } = require("luxon"); // Import Luxon for date handling

/**
 * 
 * @param {{mongoDatabase:import("../../MongoDatabase").MongoDatabase}} param0 
 */
module.exports.calculatePerf = async function calculatePerf({mongoDatabase}) {
    console.log("fn:calculatePerf");
    // calculate
    async function calculate() {

        //calculatePeriodStats
        async function calculatePeriodStats(startDate, endDate) {
            // /**
            //  * @type {import("../../MongoDatabase/collections/traded_positions/types").TradedPosition_Collection_Document_Interface} 
            //  */
            // const query = { status: "CLOSED" };
        
            // if (startDate) query.close_date = { ...query.close_date, $gte: startDate.toMillis() };
            // if (endDate) query.close_date = { ...query.close_date, $lt: endDate.toMillis() };
            // console.log({query});
            const trades = await (await mongoDatabase.collection.tradedPositionsCollection.getAllDocumentsBy({
                status:"CLOSED",
                close_timestamp: {
                    $gte: startDate?startDate.toMillis():null,
                    $lt: endDate?endDate.toMillis():null
                }
            })).toArray();
            // const trades = await (await mongoDatabase.collection.tradedPositionsCollection.getAllDocumentsBy(query)).toArray();
            console.log({trades:trades.length});
            let totalROI = 0;
            let totalRealROI = 0;
            let winTrades = 0;
            let totalTrades = trades.length;
        
            trades.forEach(trade => {
                totalROI += trade.roi_percentage;
                totalRealROI += trade.roi_percentage * trade.allocation_percentage;
                if (trade.roi_percentage > 0) winTrades++;
            });
        
            totalRealROI /= totalTrades;
        
            return {
                totalROI,
                totalRealROI,
                winRate: `${winTrades}/${totalTrades}`,
            };
        }
    
    
        // calculate
        // const perf = await Performance.findOne({});
        const perf = (await mongoDatabase.collection.performanceCollection.findOne({}));
        const today = DateTime.now().startOf("day");
        const yesterday = today.minus({ days: 1 });
    
        const statsToday = await calculatePeriodStats(today, today.plus({ days: 1 }));
        const statsYesterday = await calculatePeriodStats(yesterday, today);
        const statsWeekly = await calculatePeriodStats(today.minus({ days: 7 }), today);
        const statsAll = await calculatePeriodStats(null, null);
        
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthStats = {};
        for (let month = 0; month < 12; month++) {
            const firstDayOfMonth = DateTime.now().startOf("year").plus({ months: month });
            const lastDayOfMonth = firstDayOfMonth.plus({ months: 1 });
            const stats = await calculatePeriodStats(firstDayOfMonth, lastDayOfMonth);
            const monthNameAsKey = months[month].toLocaleLowerCase();
            monthStats[`${monthNameAsKey}_roi_percentage`] = stats.totalROI;
            monthStats[`${monthNameAsKey}_real_roi_percetage`] = stats.totalRealROI;
            monthStats[`${monthNameAsKey}_win`] = stats.winRate;
        }
    
        if(perf){
            console.log("Updating Perfomance doc");
            //update perf
            await mongoDatabase.collection.performanceCollection.updateDocument(perf._id,{
                update_date: DateTime.now().toJSDate(),
                today_roi_percentage: statsToday.totalROI,
                today_real_roi_percentage: statsToday.totalRealROI,
                today_win: statsToday.winRate,
                yesterday_roi_percentage: statsYesterday.totalROI,
                yesterday_real_roi_percentage: statsYesterday.totalRealROI,
                yesterday_win: statsYesterday.winRate,
                weekly_roi_percetage: statsWeekly.totalROI,
                weekly_real_roi_percetage: statsWeekly.totalRealROI,
                weekly_win: statsWeekly.winRate,
                all_roi_percentage: statsAll.totalROI,
                all_real_roi_percentage: statsAll.totalRealROI,
                all_win: statsAll.winRate,
                ...monthStats
            });
        }else {
            console.log("Creating new Peromance doc 1:");
            // create new perf doc
            await mongoDatabase.collection.performanceCollection.createNewDocument({
                update_date: DateTime.now().toJSDate(),
                today_roi_percentage: statsToday.totalROI,
                today_real_roi_percentage: statsToday.totalRealROI,
                today_win: statsToday.winRate,
                yesterday_roi_percentage: statsYesterday.totalROI,
                yesterday_real_roi_percentage: statsYesterday.totalRealROI,
                yesterday_win: statsYesterday.winRate,
                weekly_roi_percetage: statsWeekly.totalROI,
                weekly_real_roi_percetage: statsWeekly.totalRealROI,
                weekly_win: statsWeekly.winRate,
                all_roi_percentage: statsAll.totalROI,
                all_real_roi_percentage: statsAll.totalRealROI,
                all_win: statsAll.winRate,
                ...monthStats
            });

        }
    }

    // calculatePerf
   
    const perf = await (await mongoDatabase.collection.performanceCollection.getAllDocuments({})).toArray();
    console.log({perf});
    const today = DateTime.now();
    if (perf && perf.length >= 1) {
        const userUpdateDate = DateTime.fromJSDate(perf.updateDate);
        if (
            userUpdateDate.day !== today.day ||
            userUpdateDate.month !== today.month ||
            userUpdateDate.year !== today.year
        ) {
            await calculate();
            await mongoDatabase.collection.performanceCollection.updateDocument(perf._id,{
                update_date: today.toJSDate(), // Update the user's updateDate to today
            });
        }

    } else if (!perf||perf.length === 0) {
        console.log("Creating new Peromance doc 0:");
        await mongoDatabase.collection.performanceCollection.createNewDocument({
            updateDate: today.toJSDate(),
        });
        await calculate();
    }
};