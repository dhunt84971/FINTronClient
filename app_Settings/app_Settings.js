
//#region SETTINGS FUNCTIONS

function getSettingsfromDialog() {
    var settings = {
        host: document.getElementById("txtHost").value,
        user: document.getElementById("txtUsername").value,
        password: document.getElementById("txtPassword").value,
        database: document.getElementById("txtDatabase").value,
        port: document.getElementById("txtPort").value,
        fin: document.getElementById("txtFinLinkedServer").value
    };
    return settings;
}

function ShowWarningMessageBox(message){
    const options = {
        type: "warning",
        title: "Warning",
        buttons: ["OK"],
        message: message,
    };

    dialog.showMessageBox(null, options);
}

//#endregion SETTINGS FUNCTIONS

//#region EVENT HANDLERS

document.getElementById("btnSettingsApply").addEventListener("click", ()=>{
    settings = getSettingsfromDialog();
    console.log(settings);
    saveSettingstoFile(settings);
    config.server = settings.host;
    config.database = settings.database;
    config.user = settings.user;
    config.password = settings.password;
    config.fin = settings.fin;
});

// Test SQL connection using the settings entered.
document.getElementById("btnTestSQLConnection").addEventListener("click", ()=>{
    verifySQLConnection((result) =>{
        if (!!result){
            ShowOKMessageBox("Connection successful.");
        }
        else{
            ShowWarningMessageBox("Connection failed.");
        }
    })
});

document.getElementById("btnTestFINConnection").addEventListener("click", ()=>{
    // Use the GetLocations query to check the FIN connection.
    GetTags((err, data) =>{
        if (err){
            ShowWarningMessageBox("Connection to FIN failed.");
            return;
        }
        else{
            var tagCount = data.recordset.length;
            ShowOKMessageBox("Connection to FIN successful. \n" + tagCount + " datapoints available.");
        }
    });
});

//#endregion EVENT HANDLERS

//#region INITIALIZATION
loadSettingsfromFile(settingsFile, function(err, settings) {
    if (!err) {
        // Load the settings entry fields.
        document.getElementById("txtHost").value = settings.host;
        document.getElementById("txtPort").value = settings.port;
        document.getElementById("txtDatabase").value = settings.database;
        document.getElementById("txtFinLinkedServer").value = settings.fin;
        document.getElementById("txtUsername").value = settings.user;
        document.getElementById("txtPassword").value = settings.password;
        console.log(settings);
    } else {
        ////alert("No settings found.  Configure your settings.");
        ShowWarningMessageBox("No settings found.  Configure your settings.");
    }
});
//#endregion INITIALIZATION