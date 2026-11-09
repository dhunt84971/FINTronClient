const electron = require("electron");
const remote = require("@electron/remote");
const moment = require('moment');
const datepicker = require('js-datepicker');


const dateTimeFormat = "MM/DD/YYYY HH:mm:ss";
const dateFormat = "MM/DD/YYYY";
const timeFormat = "HH:mm:ss";

var trend;
var dpStartTime = document.getElementById("dpStartTime");
var dpEndTime = document.getElementById("dpEndTime");
var txtDuration = document.getElementById("txtDuration");
var btnAccept = document.getElementById("btnAccept");

//#region PAGE ANIMATION FUNCTIONS
function ValidTime(input){
    // Update the Duration.
    if (moment(input.value, timeFormat).isValid()){
        input.classList.remove("invalid");
        txtDuration.classList.remove("invalid");
        input.value = moment(input.value, timeFormat).format(timeFormat);
        UpdateDuration();
    }
    else
    {
        input.classList.add("invalid");
        txtDuration.classList.add("invalid");
        txtDuration.value ="N/A";
    }
    UpdateAcceptButton();
}

function ValidDate(input){
    if (moment(input.value, dateFormat, true).isValid()){
        input.classList.remove("invalid");
        txtDuration.classList.remove("invalid");
        UpdateDuration();
    }
    else{
        input.classList.add("invalid");
        txtDuration.classList.add("invalid");
        txtDuration.value = "N/A";
    }
    UpdateAcceptButton();
}

/// A range that runs backwards cannot be accepted.
function UpdateAcceptButton(){
    if (TimeRangeIsValid()){
        btnAccept.classList.remove("btnDisabled");
        console.log("Time range is valid.");
    }
    else{
        btnAccept.classList.add("btnDisabled");
        console.log("Time range is invalid.");
    }
}

function UpdateDuration(){
    txtDuration.value = GetDuration();
}

/// Puts both ends of the range into the two calendars and the two time fields.
///
/// The calendars insist on a JavaScript Date - handed a moment they throw, and
/// that is what stopped Move End to Now and the duration from changing
/// anything at all. They also limit one another, a start date capping the end
/// and the other way about, and setDate refuses a date outside those limits:
/// both ends move here, so the limits come off first and go back on around the
/// dates that end up between them.
function SetDateTimeRange(start, end){
    var startMoment = moment(start);
    var endMoment = moment(end);
    var startDate = moment(startMoment).startOf("day").toDate();
    var endDate = moment(endMoment).startOf("day").toDate();

    dpStartDate.setMax();
    dpEndDate.setMin();
    dpStartDate.setDate(startDate, true);
    dpEndDate.setDate(endDate, true);
    dpStartDate.setMax(endDate);
    dpEndDate.setMin(startDate);

    dpStartTime.value = startMoment.format(timeFormat);
    dpEndTime.value = endMoment.format(timeFormat);

    dpStartTime.classList.remove("invalid");
    dpEndTime.classList.remove("invalid");
    txtDuration.classList.remove("invalid");

    UpdateDuration();
    UpdateAcceptButton();
}

/// The current time on the historian, not on this PC.
///
/// This window has no database connection of its own, so it asks the window
/// that opened it - the one whose connection the rest of the application uses
/// - and gets the answer back on a channel of its own naming. If the historian
/// cannot be reached, this PC's clock is better than a button that does
/// nothing.
function GetServerNow(callback){
    var win = remote.getCurrentWindow();
    var parent = win.getParentWindow();
    if (!parent || parent.isDestroyed()){
        callback(moment());
        return;
    }

    var channel = "serverNow_" + win.id + "_" + Date.now();
    var answered = false;
    var answer = function (when){
        if (answered) return;
        answered = true;
        electron.ipcRenderer.removeAllListeners(channel);
        callback(when);
    };

    var timer = window.setTimeout(function (){
        console.log("The historian did not answer; using this PC's clock.");
        answer(moment());
    }, 5000);

    electron.ipcRenderer.once(channel, function (event, data){
        window.clearTimeout(timer);
        var when = (data && data.now) ? moment(data.now, dateTimeFormat) : null;
        answer((when && when.isValid()) ? when : moment());
    });

    parent.webContents.send("serverNow", { windowId: win.id, channel: channel });
}

//#endregion PAGE ANIMATION FUNCTIONS

//#region EVENT HANDLERS
electron.ipcRenderer.on('timeData', (event, trendData) => {
    if (trendData){
        trend = trendData;
        console.log(trend);
        dpStartDate.setDate(moment(trend.startTime, dateTimeFormat).startOf("day").toDate(), true);
        dpEndDate.setDate(moment(trend.endTime, dateTimeFormat).startOf("day").toDate(), true);
        dpStartTime.value = moment(trend.startTime, dateTimeFormat).format(timeFormat);
        dpEndTime.value = moment(trend.endTime, dateTimeFormat).format(timeFormat);
        UpdateDuration();
    }
    else{
    
    }
});

document.getElementById("btnAccept").addEventListener("click", () =>{
    console.log("sending trend data....");
    trend.startTime = GetStartTime();
    trend.endTime = GetEndTime();
    electron.ipcRenderer.send("timedata", trend);
    var window = remote.getCurrentWindow();
    window.close();
});

document.getElementById("btnCancel").addEventListener("click", () =>{
    var window = remote.getCurrentWindow();
    window.close();
});

dpStartTime.addEventListener("change", () =>{
    ValidTime(dpStartTime);
});

dpEndTime.addEventListener("change", () =>{
    ValidTime(dpEndTime);
});

document.getElementById("dpStartDate").addEventListener("change", () =>{
    ValidDate(document.getElementById("dpStartDate"));
});

document.getElementById("dpEndDate").addEventListener("change", () =>{
    ValidDate(document.getElementById("dpEndDate"));
});

document.getElementById("btnNow").addEventListener("click", () =>{
    MoveToNow();
});

txtDuration.addEventListener("change", ()=>{
    ApplyDurationChange();
})
//#endregion EVENT HANDLERS

//#region DATETIME FUNCTIONS
function FormatTime(input, date, instance){
    const value = moment(date).format(timeFormat);
    input.value = value;
}

function TimeRangeIsValid(){
    if (!moment(dpStartTime.value, timeFormat).isValid()){return false;}
    if (!moment(dpEndTime.value, timeFormat).isValid()){return false;}
    if (!moment(dpStartDate.el.value, dateFormat, true).isValid()){return false;}
    if (!moment(dpEndDate.el.value, dateFormat, true).isValid()){return false;}
    var start = moment(GetStartTime(), dateTimeFormat).toDate();
    var end = moment(GetEndTime(), dateTimeFormat).toDate();
    if (moment(end).diff(moment(start)) < 0 ){return false;}

    return true;
}

function GetStartTime(){
    var retValue = dpStartDate.el.value + " " + dpStartTime.value;
    return retValue;
}

function GetEndTime(){
    var retValue = dpEndDate.el.value + " " + dpEndTime.value;
    return retValue;
}

function GetDuration(){
    var start = moment(GetStartTime(), dateTimeFormat).toDate();
    var end = moment(GetEndTime(), dateTimeFormat).toDate();

    console.log("start = " + start);
    
    var timeRemaining = (moment(end).diff(moment(start)))/1000;
    var s = timeRemaining % 60;
    timeRemaining = Math.trunc(timeRemaining / 60);
    var m = timeRemaining % 60;
    timeRemaining = Math.trunc(timeRemaining / 60);
    var h = timeRemaining % 24;
    var d = Math.trunc(timeRemaining / 24);
    var retTime = [];

    if (d > 0){retTime.push(d + "d");}
    if (h > 0){retTime.push(h + "h");}
    if (m > 0){retTime.push(m + "m");}
    if (s > 0){retTime.push(s + "s");}

    var retTimeRange = retTime.join(" ");
    if (retTimeRange.length==0){
        retTimeRange = "N/A";

    }
    return retTimeRange;
}

function MoveToNow() {
    var start = moment(GetStartTime(), dateTimeFormat);
    var end = moment(GetEndTime(), dateTimeFormat);
    if (!start.isValid() || !end.isValid()) return;
    var durationSeconds = end.diff(start, "seconds");

    // The end goes to the historian's clock and the start follows it, so the
    // duration the window is showing is the duration it keeps.
    GetServerNow(function (now){
        SetDateTimeRange(moment(now).subtract(durationSeconds, "seconds"), now);
    });
}

function ApplyDurationChange(){
    // Split the entered duration by spaces.
    
    var timeParts = txtDuration.value.split(" ");
    var durationSeconds = 0;
    for (var i = 0; i<timeParts.length; i++){
        switch(timeParts[i].substring(timeParts[i].length - 1)){
            case "s":
                durationSeconds += parseInt(timeParts[i].substring(0,timeParts[i].length-1));
                break;
            case "m":
                durationSeconds += 60 * parseInt(timeParts[i].substring(0,timeParts[i].length-1));
                break;
            case "h":
                durationSeconds += 3600 * parseInt(timeParts[i].substring(0,timeParts[i].length-1));
                break;
            case "d":
                durationSeconds += 86400 * parseInt(timeParts[i].substring(0,timeParts[i].length-1));
                break;
        }
    }

    if (durationSeconds > 0){
        // The start stays where it is and the end moves to meet the duration
        // that has just been entered.
        var start = moment(GetStartTime(), dateTimeFormat);
        if (!start.isValid()) return;
        SetDateTimeRange(start, moment(start).add(durationSeconds, "seconds"));
    }
    else{
        // The entered time is invalid.
        txtDuration.classList.add("invalid");
        ////txtDuration.value ="N/A";

    }
}
//#endregion DATETIME FUNCTIONS

//#region INITIALIZATION CODE

const dpStartDate = datepicker(document.getElementById("dpStartDate"), {
    id: 1,
    onSelect: (instance, selectedDate) => {
        dpEndDate.setMin(selectedDate);
        UpdateDuration();
    },
    maxDate: new Date(),
    minDate: new Date(2000, 1, 1),
    formatter: (input, date, instance) =>{
        input.value = moment(date).format(dateFormat);
    }
});
   
const dpEndDate = datepicker(document.getElementById("dpEndDate"), {
    id: 2,
    onSelect: (instance, selectedDate) => {
        dpStartDate.setMax(selectedDate);
        UpdateDuration();
    },
    minDate: new Date(2000, 1, 1),
    formatter: (input, date, instance) =>{
        input.value = moment(date).format(dateFormat);
    }
});

// Touch mode opens this window taller than a mouse needs, and the height the
// content does not use collects as a gap above the buttons.
if (window.touchUI) {
    window.requestAnimationFrame(function () { touchUI.fitHeight(); });
}

//#endregion INITIALIZATION CODE


