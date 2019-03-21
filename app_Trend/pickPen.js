
var TreeView = require('js-treeview');
var emptyPen = {
    name: "Default",
    description: "Default",
    color: "#FFFFFF",
    min: 0,
    max: 100,
    rangeAuto: true,
    location: "Default"
}
var pickedPen;
var tvLocations;
var pickedLocation;
var dataLocations = [];
var txtTop_description = document.getElementById("txtTop_description");
var txtTop_entry = document.getElementById("txtTop_entry");

/* var tvLocations = new TreeView([
    { name: 'Item 1', children: [] },
    { name: 'Item 2', expanded: true, children: [
            { name: 'Sub Item 1', children: [] },
            { name: 'Sub Item 2', children: [] }
        ]
    }
], 'tvLocations');
 */

//#region PAGE ANIMATION FUNCTIONS
function SelectByInnerText(divID, inText){
    var buttons = document.getElementById(divID).children;
    console.log(buttons);
    for (var i = 0; i < buttons.length; i++){
        console.log(buttons[i].innerText);
        if (buttons[i].innerText == inText){
            buttons[i].classList.add("btn_selected");
        }
        else{
            buttons[i].classList.remove("btn_selected");
        }
    }
}

//#endregion PAGE ANIMATION FUNCTIONS


//#region TAGLIST FUNCTIONS

function SelectLocation(location){
    EmptyDiv("lstTags");
    pickedLocation = location;
    GetTagsbyLocation(pickedLocation, (err, data) => {
        if (err){
            ShowWarningMessageBox("Failed to get data.");
            return;
        }
        console.log(data);
        data.recordset.forEach(rec => {
            AddItemtoDiv("lstTags", rec.Name, "datapoint");
        });
    });
}

function AddItemtoDiv(divById, itemInnerText, classAdd){
    var newItem = document.createElement("div");
    newItem.innerText = itemInnerText;
    newItem.classList.add(classAdd);
    document.getElementById(divById).appendChild(newItem);
}

function EmptyDiv(divById){
    document.getElementById(divById).innerHTML = "";
}

function DatapointPicked(dp, callback){
    //alert("Datapoint picked = " + dp);
    if (!pickedPen) {
        pickedPen = emptyPen;
    }
    pickedPen.name = dp;
    pickedPen.location = pickedLocation;
    GetTagDescription(dp, (err, result) => {
        if (err){
            ShowWarningMessageBox("Failed to get data.");
            return;
        }
        
        var units = "";
        if (result.recordset[0].Units){
            units = " (" + result.recordset[0].Units + ")";
        }
        pickedPen.description = result.recordset[0].Description + units;
        txtTop_entry.innerText = pickedPen.name;
        txtTop_description.innerText = pickedPen.description;
        if (callback){
            callback();
        }
        
    });
    
}
//#endregion TAGLIST FUNCTIONS

//#region EVENT HANDLERS
document.body.addEventListener("click",function(e){
    if(e.target && e.target.classList.contains("datapoint")){
        SelectByInnerText("lstTags", e.target.innerText);
        DatapointPicked(e.target.innerText);
    }
});

document.body.addEventListener("click",function(e){
    if(e.target && e.target.classList.contains("location")){
        SelectByInnerText("lstLocations", e.target.innerText);
        SelectLocation(e.target.innerText);
    }
});

document.body.addEventListener("dblclick",function(e){
    if(e.target && e.target.classList.contains("datapoint")){
        SelectByInnerText("lstTags", e.target.innerText);
        DatapointPicked(e.target.innerText, () =>{
            electron.ipcRenderer.send("pen", pickedPen);
        });
    }
});

electron.ipcRenderer.on('penData', (event, pen) => {
    loadDBConfig(()=>{
        init(()=>{
            if (pen){
                pickedPen = pen;
                document.getElementById("txtTop_entry").innerText = pickedPen.name;    
            }
            else{
                document.getElementById("txtTop_entry").innerText = "<Select a tag>";
            }
        });
    }); 
});

document.getElementById("btnSelect").addEventListener("click", () =>{
    console.log("sending pickedPen");
    electron.ipcRenderer.send("pen", pickedPen);
    //var window = remote.getCurrentWindow();
    //window.close();
});

document.getElementById("btnDone").addEventListener("click", () =>{
    var window = remote.getCurrentWindow();
    const size = remote.getCurrentWindow().getSize();
    saveWindowSize("pickPen", size);
    window.close();
});

//#endregion EVENT HANDLERS

//#region INITIALIZATION CODE

// Get the locations from the database and fill in the treeview.
// This treeview will eventually be replaced with a custom written one.
function init(callback){
    GetLocations((err, data) =>{
        if (err){
            ShowWarningMessageBox("Failed to get data.");
            return;
        }
        
        console.log(data);
        // Add code to parse the returned data into a tvLocations treeview data object.
        //::TODO::

        if (err){
            ShowWarningMessageBox("Failed to get data.");
            return;
        }
        console.log(data);
        data.recordset.forEach(rec => {
            AddItemtoDiv("lstLocations", rec.Location, "location");
        });

        // Pick the first location.
        SelectByInnerText("lstLocations", data.recordset[0].Location);
        SelectLocation(data.recordset[0].Location);
        
        if (callback){
            callback();
        }
    });
}


//#endregion INITIALIZATION CODE