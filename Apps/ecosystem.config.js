module.exports = {
    apps : [
        {
            name: "Average_Calc",
            script: "./Average_Calc/app.js"
        },
        {
            name: "Executor",
            script: "./Executor/app.js"
        },
        {
            name : "ScrapeFollowedTradersPositions",
            script : "./ScrapeFollowedTradersPositions/app.js"
        },
        {
            name : "ScrapeTraders",
            script : "./ScrapeTraders/app.js",
            // restart_delay: "10800000" // 3 hours in milliseconds
        },
        {
            name   : "SendSignalsToTelegram",
            script : "./SendSignalsToTelegram/app.js"
        },
       
        {
            name : "UpdateSavedTradersStats",
            script : "./UpdateSavedTradersStats/app.js",
            // restart_delay: "10800000" // 3 hours in milliseconds
        }
    ]
};
  