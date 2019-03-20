const electron = require("electron");
const remote = require('electron').remote;

var pickedPen;
var optAuto = document.getElementById("optAuto");
var optManual = document.getElementById("optManual");
var txtMin = document.getElementById("txtMin");
var txtMax = document.getElementById("txtMax");

//#region PEN MODIFIER FUNCTIONS
function UpdatePen(){
    pickedPen.min = txtMin.value;
    pickedPen.max = txtMax.value;
    pickedPen.rangeAuto = optAuto.checked;
}

//#endregion PEN MODIFIER FUNCTIONS

//#region PAGE ANIMATION FUNCTIONS
function InitPageObjects(){
    document.getElementById("txtTitle").innerText = pickedPen.name;
    optAuto.checked = pickedPen.rangeAuto;
    optManual.checked = !pickedPen.rangeAuto;
    txtMin.value = FormatReal(pickedPen.min, 4);
    txtMax.value = FormatReal(pickedPen.max, 4);
    UpdateRange();
}

function UpdateRange(){
    if (optAuto.checked){
        txtMin.disabled = true;
        txtMax.disabled = true;
    }
    else
    {
        txtMin.disabled = false;
        txtMax.disabled = false;
    }
}

/// Format real numbers in a more reasonable way.
function FormatReal(num, numSigFigs){
    if (num > (10**numSigFigs)){
        return num.toFixed(0);
    }
    
    var i =0;
    for (i=0; i<numSigFigs; i++){
        if (num < (10**i)){
            
            break;
        }
    }
    if (i > 0){
        return num.toFixed(numSigFigs-i);
    }

    if (i <= 0){
        var x=0;
        for (x=0; x<10; x++){
            if (num > (10**(-1*x))){
                return num.toFixed(numSigFigs);
            }
        }
    }
    return num.toExponential(numSigFigs-1);
}
//#endregion PAGE ANIMATION FUNCTIONS

//#region EVENT HANDLERS
electron.ipcRenderer.on('penData', (event, pen) => {
    if (pen){
        pickedPen = pen;
        InitPageObjects();
    }
    else{
        document.getElementById("txtTitle").innerText = "Error - no pen";
    }
});

document.getElementById("btnCancel").addEventListener("click", () =>{
    var window = remote.getCurrentWindow();
    window.close();
});

document.getElementById("btnDone").addEventListener("click", () =>{
    console.log("sending Pen Properties");
    UpdatePen();
    electron.ipcRenderer.send("penProps", pickedPen);
    var window = remote.getCurrentWindow();
    window.close();
});

optAuto.addEventListener("change", ()=>{
    UpdateRange();
});

optManual.addEventListener("change", ()=>{
    UpdateRange();
});

document.getElementById("btnRemovePen").addEventListener("click", () =>{
    console.log("sending removePen message");
    UpdatePen();
    electron.ipcRenderer.send("removePen", pickedPen);
    var window = remote.getCurrentWindow();
    window.close();
});

//#endregion EVENT HANDLERS

//#region INITIALIZATION CODE

//#endregion INITIALIZATION CODE