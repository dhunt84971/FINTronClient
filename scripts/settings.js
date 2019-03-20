const settingsFile = ".settings";
var settings = {};

/// Save settings to the .settings file.
function saveSettingstoFile(settings) {
    var json = JSON.stringify(settings);
    fs.writeFileSync(settingsFile, json, "utf8");
}
  
/// Load settings from the .settings file.
function loadSettingsfromFile(fName, callback) {
    var settings;
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
            // loadup the config object for the applciation.
            config.server = settings.host;
            config.database = settings.database;
            config.user = settings.user;
            config.password = settings.password;
            config.fin = settings.fin;
    
        } else {
            console.log("Error reading settings file.");
        }
        if (callback){
            callback(err, config);
        }
    });
    
}