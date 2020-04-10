//#region GLOBAL DECLARATIONS
"use strict";
const electron = require("electron");
const { remote } = require("electron");
const { dialog } = require("electron").remote;
const moment = require("moment");
const ipc = require("electron").ipcRenderer;
const fs = require("fs");
const jsPDF = require("jspdf");

const dateTimeFormat = "MM/DD/YYYY HH:mm:ss";

var config = {};

function ShowWarningMessageBox(message){
    const options = {
        type: "warning",
        title: "Warning",
        buttons: ["OK"],
        message: message,
    };

    dialog.showMessageBox(null, options);
}

function ShowOKMessageBox(message){
    const options = {
        type: "info",
        title: "Information",
        buttons: ["OK"],
        message: message,
      };
    
      dialog.showMessageBox(null, options);
}