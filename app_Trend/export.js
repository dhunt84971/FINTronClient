const electron = require("electron");
const remote = require("@electron/remote");
const moment = require('moment');
const { dialog } = require("@electron/remote");

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

async function GetFilename(){
    const options = {
        defaultPath: "./documents",
        filters: [
            { name: 'CSV Files', extensions: ['csv'] }
          ]
    }

    // The native save dialog belongs to the OS and cannot be typed into with
    // the application's own on-screen keyboard, so a touch panel browses and
    // names the file in-page instead.
    let savePath;
    if (window.touchUI && touchUI.enabled && window.touchDialogs){
        const path = require("path");
        const current = txtFileName.value || "";
        const startDir = (current !== "" && path.isAbsolute(current)) ?
            path.dirname(current) : remote.app.getPath("documents");
        savePath = await touchDialogs.pickFile({
            mode: "save",
            title: "Export to CSV",
            dir: startDir,
            extensions: ["csv"],
            defaultName: path.basename(current)
        });
    }
    else {
        savePath = await dialog.showSaveDialog(null, options);
    }

    if (savePath.canceled) return;
    console.log(savePath.filePath);
    txtFileName.value = MakeFilenameCSV(savePath.filePath);
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

// Touch mode opens this window taller than a mouse needs, and the height the
// content does not use collects as a gap above the buttons.
if (window.touchUI) {
    window.requestAnimationFrame(function () { touchUI.fitHeight(); });
}

//#endregion INITIALIZATION CODE