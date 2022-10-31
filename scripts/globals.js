//#region GLOBAL DECLARATIONS
"use strict";
const electron = require("electron");
const { remote } = require("electron");
const { dialog } = require("electron").remote;
const moment = require("moment");
const ipc = require("electron").ipcRenderer;
const fs = require("fs");
const jsPDF = require("jspdf");

const settingsFile = ".settings";
const libAppSettings = require("lib-app-settings");
const appSettings = new libAppSettings(settingsFile);

const DEBUG_MODE = true; // Set to true to open all devtools.
const dateTimeFormat = "MM/DD/YYYY HH:mm:ss";
const APPDIR = electron.remote.app.getAppPath();
const DOCSDIR = electron.remote.app.getPath("documents");
var db;

var config = {};
var numWaiting = 0;

let globals = {

    //#region EVENT HELPER FUNCTIONS
   // Call this from an async function with await to holdup execution.
   sleep: function (milliseconds) {
       return new Promise(resolve => setTimeout(resolve, milliseconds));
   },

   respondToVisibility : function (element, callback) {
       var options = {
         root: document.documentElement
       }
     
       var observer = new IntersectionObserver((entries, observer) => {
         entries.forEach(entry => {
           callback(entry.intersectionRatio > 0);
         });
       }, options);
     
       observer.observe(element);
   },
   //#endregion EVENT HELPER FUNCTIONS

    //#region NOTIFICATION WINDOWS

   showWarningMessageBox: function (message) {
       const options = {
           type: "warning",
           title: "Warning",
           buttons: ["OK"],
           message: message,
       };

       dialog.showMessageBox(null, options);
   },

   showOKMessageBox: function (message) {
       const options = {
           type: "info",
           title: "Information",
           buttons: ["OK"],
           message: message,
       };

       dialog.showMessageBox(null, options);
   },

   showConfirmationBox: function (message) {
       const options = {
           type: "info",
           title: "Confirm",
           buttons: ["Yes", "No", "Cancel"],
           message: message,
       };

       let response = dialog.showMessageBoxSync(null, options);

       return response == 0;
   },

   //#endregion NOTIFICATION WINDOWS

    //#region BUSY INDICATORS
   showWaitImage: function () {
       // This will display the wait image in the center of the calling window.
       numWaiting += 1;
       console.log("waiting = " + numWaiting );
       if (!!document.getElementById("imgWaitImage")) {
           return; //The image is already being displayed.
       }
       var waitImagePath = 'file://' + APPDIR + '/images/wait.gif';
       var waitImg = document.createElement("img");
       waitImg.id = "imgWaitImage";
       waitImg.src = waitImagePath;
       document.body.appendChild(waitImg);
       console.log("Added wait image.");
   },

   hideWaitImage: function () {
       // This will hide the wait image.
       numWaiting -= 1;
       if (numWaiting <= 0) {
           var waitImg = document.getElementById("imgWaitImage");
           if (!!waitImg) document.body.removeChild(waitImg);
           numWaiting = 0;
       }
       console.log("Waiting = " + numWaiting);
   },
   //#endregion BUSY INDICATORS

    //#region DOM HELPER FUNCTIONS
   parentContaining: function (el, className) {
    try{
        if (el) {
            if (el.classList.contains(className)) {
                return el;
            } else {
                if (el.parentNode) {
                    return this.parentContaining(el.parentNode, className);
                } else {
                    return null;
                }
            }
        }
    }
    catch(e){
        return null;
    }
},

removeClass: function (pElement, className) {
    let p = pElement;
    if (!(p instanceof HTMLElement)){
        p = document.getElementById(pElement);
    }
    let buttons = p.querySelectorAll("." + className);
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove(className);
    }
},

removeChildren: function (elId) {
    let elChildren = document.getElementById(elId);
    while (elChildren.childElementCount > 0) {
        elChildren.removeChild(elChildren.lastChild);
    }
    console.log("Removed all children from " + elId);
},

addStyleToAllChildren: function(el, style){
    el.classList.add(style);
    var numChildren = el.children.length;
    for (var i = 0; i < numChildren; i++)
        this.addStyleToAllChildren(el.children[i], style);
    return;
},

removeStyleToAllChildren: function(el, style){
    el.classList.remove(style);
    var numChildren = el.children.length;
    for (var i = 0; i < numChildren; i++)
        this.removeStyleToAllChildren(el.children[i], style);
    return;
},

addOption: function (selectElId, optionText, optionValue) {
    var selectEl = document.getElementById(selectElId);
    var optionEl = document.createElement("option");
    optionEl.textContent = optionText;
    optionEl.value = optionValue;
    selectEl.appendChild(optionEl);
    console.log("Added " + optionText + " to " + selectElId);
},

addColHeader: function (trId, className, colspan, text, text2) {
    var trEl = document.getElementById(trId);
    var thEl = document.createElement("th");
    if (className.length > 0) thEl.classList.add(className);
    if (colspan > 1) thEl.colSpan = colspan;
    if (text != " " && text != "") thEl.innerHTML = text;
    if (text2 != " " && text2 != "") thEl.innerHTML += "</br>" + text2;
    trEl.appendChild(thEl);
    console.log("Added " + text + " to " + trId);
},

selectGroupBtn : function (groupEls, selectedClass, buttonId){
    for (var i = 0; i < groupEls.length; i++){
        groupEls[i].classList.remove(selectedClass);
    }
    if (buttonId){
        document.getElementById(buttonId).classList.add(selectedClass);
    }
},

addBtnGroupListener : function (btnGroup, initialId, changecallback){
    for (var btn of btnGroup){
        btn.addEventListener("click", (e) => {
            var el = e.target;
            if (e.target.nodeName != "DIV"){
                el = el.parentNode;
            }
            if (!el.classList.contains("disabled"))
                globals.selectGroupBtn(btnGroup, "selected", el.id);
            if (changecallback) changecallback(e);
        });
    };
    globals.selectGroupBtn(btnGroup, "selected", initialId);
},

setSelected : function (btnGroupId, selectedClass, buttonId){
    var btnGroup = document.querySelectorAll("*[btnGroup='" + btnGroupId + "']");
    this.selectGroupBtn(btnGroup, selectedClass, buttonId);
},

getSelected : function (btnGroupId, selectedClass){
    var btnGroup = document.querySelectorAll("*[btnGroup='" + btnGroupId + "']");
    for (var btn of btnGroup){
        if (btn.classList.contains(selectedClass)){
            return btn.id;
        }
    }
    return;
},

isVisibleById : function (elId){
    return !document.getElementById(elId).classList.contains("hide");
},

hasStyleById : function (elId, styleName){
    return document.getElementById(elId).classList.contains(styleName);
},

clearSortingById : function (sortGroup){
    for (const col of document.querySelectorAll("span[sortGroup='" + sortGroup + "']")){
        col.setAttribute("class", "hide");
    }
},

sortTableByColId : function (tableId, colhId, colIdx, hasFilterRow) {
    // This function will sort the data in the table by the columnheader.
    let tbl = document.getElementById(tableId);
    let colh = document.getElementById(colhId);
    let newSort = (colh.classList.contains("hide") || colh.classList.contains("sortASC")) ?
        "sortDESC" : "sortASC";
    
    // Remove the sorting for all of the other columnheaders in this table.

    let sortGroup = colh.getAttribute("sortGroup");
    for (const col of tbl.querySelectorAll("span[sortGroup='" + sortGroup + "']")){
        col.setAttribute("class", "hide");
    }
    // Set the sorting icon for the column header clicked on.
    colh.setAttribute("class", newSort);

    let startingRow = (hasFilterRow) ? 2 : 1;

    // The following code was taken from: 
    // https://www.w3schools.com/howto/howto_js_sort_table.asp
    var rows, switching, i, x, y, shouldSwitch;
    switching = true;
    while (switching) {
      switching = false;
      rows = tbl.rows;
      for (i = startingRow; i < (rows.length - 1); i++) {
        shouldSwitch = false;
        x = rows[i].getElementsByTagName("TD")[colIdx];
        y = rows[i + 1].getElementsByTagName("TD")[colIdx];
        if (newSort=="sortASC" && x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()){
          shouldSwitch = true;
          break;
        }
        if (newSort=="sortDESC" && x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()){
          shouldSwitch = true;
          break;
        }
      }
      if (shouldSwitch) {
        rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
        switching = true;
      }
    }
},

filterTableByColId : function (tableId, colIdx, filter){
    // This will hide all rows that do not meet the filter pattern.
    let f = filter.toLowerCase();
    let colWidths = this.getTableColWidths(tableId);
    
    // Do nothing if the filter pattern is empty.
    if (f=="") return;
    let tbl = document.getElementById(tableId);
    let rows = tbl.rows;
    let rows_length = rows.length;
    for (var i = 2; i < rows_length; i++){
        // Skip rows that are already hidden.
        if (rows[i].classList.contains("hide")) continue;
        let tdVal = rows[i].cells[colIdx].innerHTML.toLowerCase();
        //tdVal.includes(f) ? rows[i].classList.remove("hide") : rows[i].classList.add("hide");
        tdVal.includes(f) ? null : rows[i].classList.add("hide");
    }
    this.setTableColWidths(tableId, colWidths);
},

filterTableClearById : function (tableId) {
    let tbl = document.getElementById(tableId);
    let rows = tbl.rows;
    for (var i = 2; i < rows.length; i++){
        rows[i].classList.remove("hide");
    }
},

getRandomColor: function (){
    var color = {};
    color.r = Math.floor(Math.random() * 200);
    color.g = Math.floor(Math.random() * 200);
    color.b = Math.floor(Math.random() * 200);
    color.c = "rgb(" + color.r + ", " + color.g + ", " + color.b + ")";
    color.h = "rgb(" + (color.r+20) + ", " + (color.g+20) + ", " + (color.b+20) + ")";
    return color;
},

hideById: function (elId){
    document.getElementById(elId).classList.add("hide");
},

hideElements: function(els){
    console.log(els);
    for (var el of els){
        console.log(el);
        el.classList.add("hide");
    }
},

hideChildren: function (el){
    var numChildren = el.children.length;
    for (var i = 0; i < numChildren; i++)
        el.children[i].classList.add("hide");
    return;
},

showChildren: function (el){
    var numChildren = el.children.length;
    for (var i = 0; i < numChildren; i++)
        el.children[i].classList.remove("hide");
    return;
},

showById: function (elId){
    document.getElementById(elId).classList.remove("hide");
},

showElements: function(els){
    console.log(els);
    for (var el of els){
        el.classList.remove("hide");
    }
},

getTableColWidths: function(tableId){
    let tbl = document.getElementById(tableId);
    let colWidths = [];
    let cols = tbl.rows[0].cells;
    for (var i=0; i<cols.length; i++){
        colWidths.push(cols[i].offsetWidth);
    }
    return colWidths;
},

setTableColWidths: function(tableId, colWidths){
    let tbl = document.getElementById(tableId);
    for (var i=0; i<tbl.rows[0].cells.length; i++){
        tbl.rows[0].cells[i].width = colWidths[i];
    }
    return colWidths;
},

clearTable : (tableID)=>{
    let elTable = document.getElementById(tableID);
    var empty_tbody = document.createElement("tbody");
    elTable.replaceChild(empty_tbody, elTable.tBodies[0]);
},

txtOverlayInputButton : {},

showtxtOverlayInput: function (el, btnEl, callback) {
    this.txtOverlayInputButton = btnEl;
    var rect = el.getBoundingClientRect();
    var txtInput = document.createElement("input");
    txtInput.id = "txtInput";
    txtInput.style.left = rect.left + "px";
    txtInput.style.top = rect.top + "px";
    txtInput.style.width = rect.width + "px";
    txtInput.style.height = rect.height + "px";
    txtInput.value = el.innerText;
    document.body.appendChild(txtInput);
    txtInput.focus();
    txtInput.select();
    txtInput.addEventListener("keyup", (e)=>{
        if (e.key == "Enter"){
            let inVal = txtInput.value;
            txtInput.remove();
            callback(inVal);
        }
    })
},

//#endregion DOM HELPER FUNCTIONS

    //#region REC TABLE FUNCTIONS
   loadRecsIntoTable: function(targetTable, recs, cells, emptyMessage){
       // This is a simple function for adding records to a table.
       this.clearTable(targetTable);
       let dTable = document.getElementById(targetTable).getElementsByTagName("tbody")[0];
       for (var rec=0; rec<recs.length; rec++){
           let dRow = dTable.insertRow(-1);
           console.log(recs[rec]);
           for (var cell=0; cell<cells.length; cell++){
               console.log(recs[rec][cells[cell]]);
               dRow.insertCell(cell).innerText = recs[rec][cells[cell]];
           }
       }
       if (recs.length == 0){
           let dRow = dTable.insertRow(-1);
           let cell = dRow.insertCell(0);
           cell.setAttribute("colspan", 3);
           cell.innerText = emptyMessage;
       }
   },

   getRecsFromTable: function(targetTable, excludeClass){
       // Returns an array of {item, count}.
       let tgtTbl = document.getElementById(targetTable);
       let rows = tgtTbl.rows;
       var recs = [];
       for (var i=1; i<rows.length; i++){
           let row = [];
           let cells = tgtTbl.rows[i].cells;
           for (var j=0; j<cells.length; j++){
               if (excludeClass){
                   if (!cells[j].classList.contains(excludeClass)){
                       row.push(cells[j].innerText);        
                   }
               }
               else{
                   row.push(cells[j].innerText);
               }
           }
           recs.push(row);
       }
       return recs;
   },

   sortRecsByCol: function(recs, order, colIdx) {
       var switching, i, x, y, shouldSwitch;
       switching = true;
       while (switching) {
         switching = false;
         for (i = 0; i < (recs.length - 1); i++) {
           shouldSwitch = false;
           x = recs[i][colIdx];
           y = recs[i + 1][colIdx];
           if (this.isNumeric(x) && this.isNumeric(y)){
               if (order=="ASC" && x > y){
                   shouldSwitch = true;
                   break;
               }
               if (order=="DESC" && x < y){
                   shouldSwitch = true;
                   break;
               }    
           }
           else{
               if (order=="ASC" && x.toLowerCase() > y.toLowerCase()){
                   shouldSwitch = true;
               break;
               }
               if (order=="DESC" && x.toLowerCase() < y.toLowerCase()){
                   shouldSwitch = true;
               break;
               }
           }
         }
         if (shouldSwitch) {
           let swap = recs[i];
           recs[i] = recs[i+1];
           recs[i+1] = swap;
           switching = true;
         }
       }
       return recs;
   },

   groupRecsByCol: function(recs, colIdx){
       // Returns an array of [item, count] where item is the distinct value 
       // at the column index and count is the number of occurrences.
       var retRecs = [];
       for (var i=0; i<recs.length; i++){
           var found = false;
           let item = recs[i][colIdx];
           // Is the item already in recs.
           for (var j=0; j<retRecs.length; j++){
               if (retRecs[j][0] == item){
                   retRecs[j][1] += 1;
                   found = true;
                   break;
               }
           }
           if (!found){
               retRecs.push([item, 1]);
           }
       }
       return retRecs;
   },

   applyFilterToRecsByCol: function(recs, colIdx, filter, caseSensitive){
       let filterType = filter.includes("%") ? "contains" : "exact";
       let f = filter.replace("%","");
       let retRecs = [];
       for (var i=0; i<recs.length; i++){
           if (filterType == "contains"){
               if (caseSensitive){
                   if (recs[i][colIdx].includes(f)){
                       retRecs.push(recs[i])
                   }
               }
               else{
                   let recLCase = recs[i][colIdx].toLowerCase();
                   if (recLCase.includes(f.toLowerCase())){
                       retRecs.push(recs[i])
                   }
               }
           }
           else{
               if (caseSensitive){
                   if (recs[i][colIdx] == f){
                      retRecs.push(recs[i])
                   }
               }
               else{
                   if (recs[i][colIdx].toLowerCase() == f.toLowerCase()){
                       retRecs.push(recs[i])
                   }
               } 
           }
       }
       return retRecs;
   },

   recsGetAllContains: function(recs, searchString){
       // This function returns a list of recs where any field in the rec contains the search string.
       // Reference: https://stackoverflow.com/questions/44312924/filter-array-of-objects-whose-any-properties-contains-a-value
       console.log(searchString.toLowerCase());

       if (searchString == "" || searchString == undefined) return recs;
       else return recs.filter(o =>
           Object.keys(o).some(k => String(o[k]).toLowerCase().includes(searchString.toLowerCase())));
   },

   recsGetFieldDistinctValues: function(recs, field){
       // This function returns an array of distinct values for the specified field.
       // Reference: https://codeburst.io/javascript-array-distinct-5edc93501dc4
       return [...new Set(recs.map(x=>x[field]))];
   },
   //#endregion REC TABLE FUNCTIONS

    //#region STRING HELPER FUNCTIONS
   getDHMSFromSecs: function(seconds){
        let timeRemaining = seconds;
        let s = timeRemaining % 60;
        timeRemaining = Math.trunc(timeRemaining / 60);
        let m = timeRemaining % 60;
        timeRemaining = Math.trunc(timeRemaining / 60);
        let h = timeRemaining % 24;
        let d = Math.trunc(timeRemaining / 24);
        let retTime = [];
        if (d > 0) retTime.push(d + "d");
        if (h > 0) retTime.push(h + "h");
        if (m > 0) retTime.push(m + "m");
        if (s > 0) retTime.push(s + "s");
        return retTime.join(" ");
    },
   //#endregion STRING HELPER FUNCTIONS

    //#region APPLICATION STATE FUNCTIONS
    saveWindowSize: function (winName, winSize){
        //winName = "<windowName>";
        //winSize = [<width>, <height>];
        return appSettings.setSettingInFile(winName, winSize);
    },

    //#endregion APPLICATION STATE FUNCTIONS
    
    //#region GLOBAL DOM FUNCTIONS
    locateMenu: function(elMenu, x, y){
        // This function properly locates the context menu so that it stays in the window. 
        elMenu.classList.remove("hide");
        let elW = elMenu.offsetWidth;
        let docW = document.body.clientWidth;
        let posX = x;
        if (elW + x > docW - 5) posX = docW - elW - 5;
        
        let elH = elMenu.offsetHeight;
        let docH = document.body.clientHeight;
        let posY = y;
        if (elH + y > docH - 5) posY = docH - elH - 5;
        
        elMenu.style.left = posX + "px";
        elMenu.style.top = posY + "px";
    },
    //#endregion GLOBAL DOM FUNCTIONS

}