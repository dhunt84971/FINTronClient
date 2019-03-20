const electron = require("electron");
const remote = require('electron').remote;
const moment = require('moment');
const jQuery = require('jquery');


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
    // Update the Accept button
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

//#endregion PAGE ANIMATION FUNCTIONS

//#region EVENT HANDLERS
electron.ipcRenderer.on('timeData', (event, trendData) => {
    if (trendData){
        trend = trendData;
        console.log(trend);
        dpStartDate.setDate(moment(trend.startTime, dateTimeFormat).startOf("day"), true);
        dpEndDate.setDate(moment(trend.endTime, dateTimeFormat).startOf("day"), true);
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
    if (!moment(dpStartDate.dateSelected).isValid()){return false;}
    if (!moment(dpStartTime.dateSelected).isValid()){return false;}
    var start = moment(GetStartTime(), dateTimeFormat).toDate();
    var end = moment(GetEndTime(), dateTimeFormat).toDate();
    if (moment(end).diff(moment(start)) < 0 ){return false;}

    return true;
}

function GetStartTime(){
    var retValue = moment(dpStartDate.dateSelected).format(dateFormat) + " " + dpStartTime.value;
    return retValue;
}

function GetEndTime(){
    var retValue = moment(dpEndDate.dateSelected).format(dateFormat) + " " + dpEndTime.value;
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
    var start = moment(GetStartTime(), dateTimeFormat).toDate();
    var end = moment(GetEndTime(), dateTimeFormat).toDate();
    var timeDuration = (moment(end).diff(moment(start)))/1000;
    
    end = moment();
    start = moment(end).subtract("seconds", timeDuration);

    dpEndDate.setDate(moment(end).startOf("day"), true);
    dpEndTime.value = moment(end).format(timeFormat);
    dpStartDate.setDate(moment(start).startOf("day"), true);
    dpStartTime.value = moment(start).format(timeFormat);
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
        var start = moment(GetStartTime(), dateTimeFormat).toDate();
        var end = moment(start).add("seconds", durationSeconds);

        dpStartDate.setDate(moment(start).startOf("day"), true);
        dpEndDate.setDate(moment(end).startOf("day"), true);
        dpStartTime.value = moment(start).format(timeFormat);
        dpEndTime.value = moment(end).format(timeFormat);
        txtDuration.classList.remove("invalid");
        UpdateDuration();
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

//#endregion INITIALIZATION CODE


