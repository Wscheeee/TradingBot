//@ts-check
const luxon = require("luxon");


class DateTime {
    daysOfWeekIndexToName = {
        0: "Sunday",
        1: "Monday",
        2: "Tuesday",
        3: "Wednesday",
        4: "Thursday",
        5: "Friday",
        6: "Saturday"
    };
    monthsIndexToName = {
        0: "January",
        1: "February",
        2: "March",
        3: "April",
        4: "May",
        5: "June",
        6: "July",
        7: "August",
        8: "September",
        9: "October",
        10: "November",
        11: "December"
    };
      
    constructor(){

    }

    now(){
        const now = new Date();
        const now_localTimeString = now.toLocaleTimeString("en-US", { hour12: false });
        const [now_hours, now_minutes, now_seconds] = now_localTimeString.split(":").map(s=>Number(s));
        // console.log({now_hours, now_minutes, now_seconds});
        return {
            hour12: false,
            hours:  now_hours,
            minutes: now_minutes,
            seconds: now_seconds,
            milliseconds: (now_seconds*1000),
            day_index: now.getDay(),
            month_index: now.getMonth(),
            year: now.getFullYear(),
            date: now.getDate(),
            local_time_string: now_localTimeString,
            date_time_string: now.toLocaleString()
        };
    }
}

const dateTime = new DateTime();
console.log(dateTime.now());

module.exports.DateTime = DateTime;