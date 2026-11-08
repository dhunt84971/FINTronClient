
//#region SETTINGS FUNCTIONS

function getSettingsfromDialog() {
    var settings = {
        host: document.getElementById("txtHost").value,
        user: document.getElementById("txtUsername").value,
        password: document.getElementById("txtPassword").value,
        database: document.getElementById("txtDatabase").value,
        port: document.getElementById("txtPort").value,
        fin: document.getElementById("txtFinLinkedServer").value,
        touchMode: touchUI.enabled,
        kioskMode: touchUI.kiosk
    };
    return settings;
}

//#region TOUCHSCREEN SETTINGS
var btnTouchMode = document.getElementById("btnTouchMode");
var btnKioskMode = document.getElementById("btnKioskMode");

function showToggleState(btn, on) {
    btn.innerText = on ? "ON" : "OFF";
    btn.classList.toggle("btnToggle_on", on);
}

function refreshTouchToggles() {
    showToggleState(btnTouchMode, touchUI.enabled);
    showToggleState(btnKioskMode, touchUI.kiosk);
}
//#endregion TOUCHSCREEN SETTINGS

function updateSettings(settings){
    saveSettingstoFile(settings);
    config.server = settings.host;
    config.port = parseInt(settings.port) || 1433;
    config.database = settings.database;
    config.user = settings.user;
    config.password = settings.password;
    config.fin = settings.fin;
    db = new appDatabase(config);
    db.connect().catch((err)=>{console.log(err);});
}

//#endregion SETTINGS FUNCTIONS

//#region EVENT HANDLERS

// The touchscreen switch applies as it is tapped rather than waiting for APPLY:
// it is the one setting whose effect the operator needs to see before they can
// comfortably use the rest of the screen.
btnTouchMode.addEventListener("click", ()=>{
    touchUI.setEnabled(!touchUI.enabled);
    osk.refresh();
    refreshTouchToggles();
});

btnKioskMode.addEventListener("click", ()=>{
    touchUI.setKiosk(!touchUI.kiosk);
    refreshTouchToggles();
});

document.getElementById("btnSettingsApply").addEventListener("click", ()=>{
    settings = getSettingsfromDialog();
    console.log(settings);
    updateSettings(settings);
});

// Test SQL connection using the settings entered.
document.getElementById("btnTestSQLConnection").addEventListener("click", ()=>{
    settings = getSettingsfromDialog();
    updateSettings(settings);
    globals.showWaitImage();
    db.verifySQLConnection((result) =>{
        globals.hideWaitImage();
        if (result){
            globals.showOKMessageBox("Connection successful.");
        }
        else{
            globals.showWarningMessageBox("Connection failed.");
        }
    })
});

document.getElementById("btnTestFINConnection").addEventListener("click", ()=>{
    settings = getSettingsfromDialog();
    updateSettings(settings);
    globals.showWaitImage();
    // Use the GetLocations query to check the FIN connection.
    db.getTags((err, data) =>{
        globals.hideWaitImage();
        if (err){
            globals.showWarningMessageBox("Connection to FIN failed.");
            return;
        }
        else{
            var tagCount = data.recordset.length;
            globals.showOKMessageBox("Connection to FIN successful. \n" + tagCount + " datapoints available.");
        }
    });
});

//#endregion EVENT HANDLERS

//#region INITIALIZATION
var appVersion = require(APPDIR + "/package.json").version;
document.getElementById("lblVersion").innerText = "v" + appVersion;

refreshTouchToggles();

loadSettingsfromFile(settingsFile, function(err, settings) {
    if (!err) {
        // Load the settings entry fields.
        document.getElementById("txtHost").value = settings.host;
        document.getElementById("txtPort").value = settings.port || 1433;
        document.getElementById("txtDatabase").value = settings.database;
        document.getElementById("txtFinLinkedServer").value = settings.fin || "";
        document.getElementById("txtUsername").value = settings.user;
        document.getElementById("txtPassword").value = settings.password;
        console.log(settings);
    } else {
        ////alert("No settings found.  Configure your settings.");
        globals.showWarningMessageBox("No settings found.  Configure your settings.");
    }
});
//#endregion INITIALIZATION