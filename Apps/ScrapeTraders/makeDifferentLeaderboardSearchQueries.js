module.exports.makeDifferentLeaderboardSearchQueries = function makeDifferentLeaderboardSearchQueries(){
    /***
     * @returns {import("../../Binance_Scraper/getLeaderboardRank_API").GetOtherLeaderboardBaseInfo_API_Payload_Interface[]} 
     */
    function getAllPossibleValues() {
        // const periodTypes = ["WEEKLY", "DAILY", "MONTHLY"];
        const periodTypes = ["ALL","WEEKLY", "DAILY", "MONTHLY"];
        const statisticsTypes = ["ROI", "PNL"];
        const tradeTypes = ["PERPETUAL", "DELIVERY"];
        const allPossibleValues = [];
      
        const isSharedValues = [true];
        const isTraderValues = [true, false];
        // const isTraderValues = [false];
      
        periodTypes.forEach(periodType => {
            statisticsTypes.forEach(statisticsType => {
                tradeTypes.forEach(tradeType => {
                    isSharedValues.forEach(isShared => {
                        isTraderValues.forEach(isTrader => {
                            allPossibleValues.push({
                                isShared: isShared,
                                isTrader: isTrader,
                                periodType: periodType,
                                statisticsType: statisticsType,
                                tradeType: tradeType
                            });
                        });
                    });
                });
            });
        });
      
        return allPossibleValues;
    }
    return getAllPossibleValues();
    // const differenSearchQueries = [
    //     {
    //         isShared:true,
    //         isTrader:false,
    //         periodType:"DAILY",
    //         statisticsType:"PNL",
    //         tradeType:"DELIVERY"
    //     },
    //     {
    //         isShared:true,
    //         isTrader:true,
    //         periodType:"DAILY",
    //         statisticsType:"PNL",
    //         tradeType:"DELIVERY"
    //     },

    // ];

    

};

