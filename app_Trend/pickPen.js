var emptyPen = {
    name: "Default",
    description: "Default",
    color: "#FFFFFF",
    units: "",
    type: 0,
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
var dbConfig;
var db;
var tagRecs;
var tagRecsFiltered;

//#region PAGE ANIMATION FUNCTIONS
function selectByInnerText(divID, inText){
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

function loadLocationsDescriptions(recs){
    emptyDiv("lstLocations");
    emptyDiv("lstTags");
    let locations = globals.recsGetFieldDistinctValues(recs, "Location");

    for (let location of locations){
        dv.addTVItem(tvDiv,location, false);
    }
    
    // Pick the first location.
    dv.selectFirstItem();
}

function loadTagsByLocation(recs, location){
    emptyDiv("lstTags");
    let tags = recs.filter(x=>x.Location == location);
    for (let tag of tags){
        //addItemtoDiv("lstTags", tag.Name, "datapoint");
        addTagtoDiv("lstTags", tag);
    }
}

//#endregion PAGE ANIMATION FUNCTIONS

//#region RESIZE SIDE BARS
var startX, startWidth;
var leftDiv = document.getElementById("leftSideLocations");

function initVDrag(e) {
  startX = e.clientX;
  console.log("Initializing resize drag....");
  console.log(e.target.id);
  startWidth = parseInt(document.defaultView.getComputedStyle(leftDiv).width, 10);
  document.documentElement.addEventListener('mousemove', doVDrag, false);
  document.documentElement.addEventListener('mouseup', stopVDrag, false);
}

function doVDrag(e) {
    let newWidth = startWidth + e.clientX - startX;
    if (newWidth < 30) newWidth = 30;
    leftDiv.style.width = `${newWidth}px`;
}

function stopVDrag(e) {
  document.documentElement.removeEventListener('mousemove', doVDrag, false);
  document.documentElement.removeEventListener('mouseup', stopVDrag, false);
  // Save the new size to the settings file.
  saveWidths();
}

function saveWidths() {
//   if (dragTargetDiv === leftDiv) {
//     appSettings.setSettingInFile("leftSideBarWidth", leftDiv.style.width);
//   } else {
//     appSettings.setSettingInFile("docsSideBarWidth", rightDiv.style.width);
//   }
}

function loadWidths() {
//   rightDiv.style.width = appSettings.getSettingsInFile("docsSideBarWidth");
}

//#endregion RESIZE SIDE BARS

//#region TAGLIST FUNCTIONS
function selectLocation(location){
    pickedLocation = location;
    loadTagsByLocation(tagRecsFiltered, pickedLocation);
}

function addTagtoDiv(divById, tag){
    var newItem = document.createElement("div");
    newItem.innerText = `${tag.Name} - ${tag.Description}`;
    newItem.setAttribute("data-tagName", tag.Name);
    newItem.title = "Double-Click to add to trend.";
    newItem.classList.add("datapoint");
    document.getElementById(divById).appendChild(newItem);
}

function addItemtoDiv(divById, itemInnerText, classAdd){
    var newItem = document.createElement("div");
    newItem.innerText = itemInnerText;
    newItem.title = "Double-Click to add to trend.";
    newItem.classList.add(classAdd);
    document.getElementById(divById).appendChild(newItem);
}

function emptyDiv(divById){
    document.getElementById(divById).innerHTML = "";
}

function datapointPicked(dp, callback){
    //alert("Datapoint picked = " + dp);
    if (!pickedPen) {
        pickedPen = emptyPen;
    }
    pickedPen.name = dp.getAttribute("data-tagName");
    pickedPen.location = pickedLocation;
    let tag = tagRecs.find(x=>x.Name == pickedPen.name);
    var units = "";
    pickedPen.units = tag.Units != null ? tag.Units : "";
    pickedPen.type = tag.Type;
    units = pickedPen.units == "" ? "" : " (" + pickedPen.units + ")";
    pickedPen.description = tag.Description + units;
    txtTop_entry.innerText = pickedPen.name;
    txtTop_description.innerText = pickedPen.description;
    if (callback){
        callback();
    }
}

function applyFilter(searchString){
    // Apply the filter from the search string.
    tagRecsFiltered = globals.recsGetAllContains(tagRecs, searchString);
}
//#endregion TAGLIST FUNCTIONS

//#region EVENT HANDLERS
document.body.addEventListener("click",function(e){
    if(e.target && e.target.classList.contains("datapoint")){
        selectByInnerText("lstTags", e.target.innerText);
        datapointPicked(e.target);
    }
});

var locationSelected = function (text){
    selectLocation(text);
}

document.body.addEventListener("dblclick",function(e){
    if(e.target && e.target.classList.contains("datapoint")){
        selectByInnerText("lstTags", e.target.innerText);
        datapointPicked(e.target, () =>{
            electron.ipcRenderer.send("pen", pickedPen);
        });
    }
});

electron.ipcRenderer.on('penData', (event, pen) => {
    loadDBConfig(()=>{
        init(()=>{
            document.getElementById("txtTop_entry").innerText = "<Select a tag>";
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
    const size = remote.getCurrentWindow().getContentSize();
    size[1] -= 20;
    globals.saveWindowSize("pickPen", size)
    .then(()=>{
        window.close();
    })
    .catch((err)=>{
        window.close();
    });
});

document.getElementById("txtSearch").addEventListener("input", () =>{
    applyFilter(document.getElementById("txtSearch").value);
    loadLocationsDescriptions(tagRecsFiltered);
});

document.getElementById("btnClearSearch").addEventListener("click", ()=>{
    document.getElementById("txtSearch").value = "";
    applyFilter(document.getElementById("txtSearch").value);
    loadLocationsDescriptions(tagRecsFiltered);
});

//#region RESIZABLE SPLITTERS
document.getElementById("vSplitter").addEventListener("mousedown", initVDrag, false);
//#endregion RESIZABLE SPLITTERS

//#endregion EVENT HANDLERS

//#region INITIALIZATION CODE

var tvDiv = document.getElementById("lstLocations");

var dv = new div_treeview(tvDiv, "\\");
dv.onSelect(locationSelected);

// Get the locations from the database and fill in the treeview.
function init(callback){
    globals.showWaitImage();
    db.getTags((err, data) =>{
        globals.hideWaitImage();
        if (err){
            globals.showWarningMessageBox("Failed to get data.");
            return;
        }
        tagRecs = data.recordset;
        applyFilter("");
        loadLocationsDescriptions(tagRecs, "");

        if (callback){
            callback();
        }
    });
}


//#endregion INITIALIZATION CODE