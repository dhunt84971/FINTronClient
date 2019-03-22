const electron = require("electron");
const remote = require('electron').remote;
const moment = require('moment');
const { dialog } = require("electron").remote;

const dateTimeFormat = "MM/DD/YYYY HH:mm:ss";
const numDisplaySamples = 1000;

var trend = {};

// HTML ELEMENT VARIABLES
var txtNumSamples = document.getElementById("txtNumSamples");
var ddSampleRate = document.getElementById("ddSampleRate");
var txtFileName = document.getElementById("txtFileName");

//#region PAGE ANIMATION FUNCTIONS

//#endregion PAGE ANIMATION FUNCTIONS

//#region HELPER FUNCTIONS
function GetNumSamples(interval_sec){
    if (!isNaN(interval_sec)){

        var start = moment(trend.startTime, dateTimeFormat).toDate();
        var end = moment(trend.endTime, dateTimeFormat).toDate();
        
        var trendSeconds = (moment(end).diff(moment(start)))/1000;
        ////console.log("trendSeconds = " + trendSeconds);
        ////console.log("interval_sec = " + interval_sec);
        return Math.round(trendSeconds / interval_sec);
    }
    else{
        return 0;
    }
}

function GetSampleRate(){
    var selectedValue = ddSampleRate.options[ddSampleRate.selectedIndex].value
    if (GetNumSamples(selectedValue) != 0){
        return selectedValue;
    }
    else{
        // Assume the displayed sample rate has been selected.
        var start = moment(trend.startTime, dateTimeFormat).toDate();
        var end = moment(trend.endTime, dateTimeFormat).toDate();
        var trendSeconds = (moment(end).diff(moment(start)))/1000;
        return trendSeconds/numDisplaySamples;
    }
}

function GetFilename(){
    const options = {
        defaultPath: "./documents",
        filters: [
            { name: 'CSV Files', extensions: ['csv'] }
          ]
    }
    dialog.showSaveDialog(null, options, (path) => {
        txtFileName.value = MakeFilenameCSV(path);
    });
}

function MakeFilenameCSV(fName){
    if (fName.substr(fName.length-4,1) == "."){
        if (fName.substr(fName.length-4) != ".csv"){
            return fName.substr(0, fName.length-4) + ".csv";
        }
        return fName;
    }
    else{
        return fName + ".csv";
    }
}
//#endregion HELPER FUNCTIONS

//#region EVENT HANDLERS
electron.ipcRenderer.on('trendData', (event, message) => {
    if (message){
        trend = message;
        txtFileName.value = MakeFilenameCSV(trend.fileName);
        ddSampleRate.value = "display";
        txtNumSamples.value = numDisplaySamples;
        console.log(trend);
    }
    else{
        document.getElementById("txtNumSamples").innerText = "Error - no trend data";
    }
});

ddSampleRate.addEventListener("change", () =>{
    var selectedValue = ddSampleRate.options[ddSampleRate.selectedIndex].value
    if (selectedValue == "display"){
        txtNumSamples.value = numDisplaySamples;
    }
    if (selectedValue > 0){
        txtNumSamples.value = GetNumSamples(selectedValue);
    }
});

document.getElementById("btnCancel").addEventListener("click", () =>{
    var window = remote.getCurrentWindow();
    window.close();
});

document.getElementById("btnSave").addEventListener("click", () =>{
    message = { fileName : txtFileName.value, sampleRate: GetSampleRate()  }
    electron.ipcRenderer.send("exportdata", message);
    var window = remote.getCurrentWindow();
    window.close();
});

document.getElementById("btnBrowse").addEventListener("click", () =>{
    GetFilename();
});

//#endregion EVENT HANDLERS

//#region INITIALIZATION CODE

//#endregion INITIALIZATION CODE