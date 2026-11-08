var settings = {};

/// Save settings to the .settings file.
///
/// The settings passed in are merged into whatever the file already holds
/// rather than replacing it. The settings dialog only knows about its own
/// fields, and the file is also home to the main window's saved bounds, the
/// popup window sizes and the touchscreen flags - a straight overwrite here
/// erased all of them.
function saveSettingstoFile(newSettings) {
    var existing = {};
    try {
        existing = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
        if (existing === null || typeof existing !== "object") {
            existing = {};
        }
    }
    catch (err) {
        existing = {};  // No settings file yet, or it is unreadable.
    }

    var merged = Object.assign(existing, newSettings);
    fs.writeFileSync(settingsFile, JSON.stringify(merged), "utf8");
    settings = merged;
}

function saveWindowSize(winName, winSize){
    //winName = "<windowName>";
    //winSize = [<width>, <height>];
    settings[winName] = winSize;
    saveSettingstoFile(settings);
}
  
/// Load settings from the .settings file.
function loadSettingsfromFile(fName, callback) {
    fs.readFile(fName, "utf8", function readFileCallback(err, data) {
        if (err) {
        console.log(err);
        } else {
            settings = JSON.parse(data); //parse into an object
        }

        if (callback) callback(err, settings);
        return settings;
    });
}

function loadDBConfig(callback){
    loadSettingsfromFile(settingsFile, function(err, settings) {
        if (!err) {
            console.log("Read settings.");
            console.log(settings);
            // loadup the config object for the application.
            config.server = settings.host;
            config.port = parseInt(settings.port) || 1433;
            config.database = settings.database;
            config.user = settings.user;
            config.password = settings.password;
            config.fin = settings.fin;
            db = new appDatabase(config);
            db.connect().catch((err)=>{console.log(err);});  // Preload the connection to speed it up.
        } else {
            console.log("Error reading settings file.");
        }
        if (callback){
            callback(err, config);
        }
    });
    
}