//#region GLOBAL DECLARATIONS
"use strict";
var config = {
    user: "",
    password: "",
    server: "",
    database: "",
    requestTimeout: 120000
}
//#endregion GLOBAL DECLARATIONS

//#region PAGE ANIMATION FUNCTIONS
function SelectAppBtn(buttonId){
    var buttons = document.querySelectorAll(".btnApp");
    for (var i = 0; i < buttons.length; i++){
        buttons[i].classList.remove("btnApp_selected");
    }
    document.getElementById(buttonId).classList.add("btnApp_selected");
}

function SelectAppWindow(id){
    var els = document.querySelectorAll(".appWindow");
    for (var i = 0; i < els.length; i++){
        els[i].style.display = "none";
    }
    document.getElementById(id).style.display="flex";
}

//#endregion PAGE ANIMATION FUNCTIONS

//#region EVENT HANDLERS

//#region APP NAV BUTTONS
document.getElementById("btnAppLive").addEventListener("click", () => {
    SelectAppBtn("btnAppLive");
    SelectAppWindow("winLive");
});
document.getElementById("btnAppTrend").addEventListener("click", () => {
    SelectAppBtn("btnAppTrend");
    SelectAppWindow("winTrend");
});
document.getElementById("btnAppExport").addEventListener("click", () => {
    SelectAppBtn("btnAppExport");
    SelectAppWindow("winExport");
});
document.getElementById("btnAppReports").addEventListener("click", () => {
    SelectAppBtn("btnAppReports");
    SelectAppWindow("winReports");
});
document.getElementById("btnAppSettings").addEventListener("click", () => {
    SelectAppBtn("btnAppSettings");
    SelectAppWindow("winSettings");
});
document.getElementById("btnAppAbout").addEventListener("click", () => {
    SelectAppBtn("btnAppAbout");
    SelectAppWindow("winAbout");
});
//#endregion APP NAV BUTTONS

//#endregion EVENT HANDLERS

//#region INITIALIZATION CODE
SelectAppBtn("btnAppTrend");
SelectAppWindow("winTrend");
loadDBConfig(); // Call to settings.loadDBConfig() //
//#endregion INITIALIZATION CODE