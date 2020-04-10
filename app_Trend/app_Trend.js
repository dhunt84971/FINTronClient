//#region GLOBAL DECLARATIONS
"use strict";
var navInc = 600;
var chartConfig = {};

/*
var pen = 
    {
        name: "Default",
        description: "Default",
        color: "#FFFFFF",
        min: 0,
        max: 100,
        rangeAuto: true,
        location: "Default"
    }];
*/
const numSamples = 2000;
var today = new Date;
var nowString = moment().format(dateTimeFormat);
var tenMinsAgo = moment().add(-10, "minutes").format(dateTimeFormat);

var trend = {
    fileName: "./documents/Untitled.trd",
    name: "Untitled.trd",
    pens: [],
    startTime: tenMinsAgo,
    endTime: nowString
};

var penColors = [
    "rgb(255, 0, 0)", //red
    "rgb(0, 255, 255)", //cyan
    "rgb(0, 255, 0)", //lightgreen
    "rgb(255, 255, 0)", //yellow
    "rgb(255, 0, 255)", //magenta
    "rgb(152, 0, 0)", //darkred
    "rgb(0, 204, 204)", //darkcyan
    "rgb(0, 153, 0)", //darkgreen
    "rgb(204, 204, 0)", //darkyellow
    "rgb(255, 0, 127)", //pink
    "rgb(255, 128, 0)", //orange
    "rgb(255, 255, 255)", //white
    "rgb(192, 192, 192)", //gray
    // repeat colors...  
    // A color picker on the properties window will provide for user color selection.
    "rgb(255, 0, 0)", //red
    "rgb(0, 255, 255)", //cyan
    "rgb(0, 255, 0)", //lightgreen
    "rgb(255, 255, 0)", //yellow
    "rgb(255, 0, 255)", //magenta
    "rgb(152, 0, 0)", //darkred
    "rgb(0, 204, 204)", //darkcyan
    "rgb(0, 153, 0)", //darkgreen
    "rgb(204, 204, 0)", //darkyellow
    "rgb(255, 0, 127)", //pink
    "rgb(255, 128, 0)", //orange
    "rgb(255, 255, 255)", //white
    "rgb(192, 192, 192)", //gray
];
var penColorIndex = 0;

var chartDoc = document.getElementById("chart").getContext("2d");
var html_titleTrend = document.getElementById("titleTrend");
var chart = new Chart(chartDoc, chartConfig);
var selectedPen; // = pens[0].name;

//#endregion GLOBAL DECLARATIONS

//#region CHART FUNCTIONS

function ClearTrend() {
    var nowString = moment().format(dateTimeFormat);
    var tenMinsAgo = moment().add(-10, "minutes").format(dateTimeFormat);

    trend = {
        name: "Untitled.trd",
        fileName: "./documents/Untitled.trd",
        pens: [],
        startTime: tenMinsAgo,
        endTime: nowString
    }
    html_titleTrend.innerText = trend.name;
    penColorIndex = 0;
    chartConfig = {};
    chart.destroy();
    chart = new Chart(chartDoc, chartConfig);
    ReloadPens();
    UpdateChart();
}

function LoadTrend(fname, callback) {
    var trendLoaded = fs.readFileSync(fname);
    trend = JSON.parse(trendLoaded);
    trend.fileName = fname;
    penColorIndex = GetPenArray().length;
    if (callback) {
        callback();
    }
}

function SaveTrend(fname, callback) {
    var trendSaveData = JSON.stringify(trend);
    fs.writeFile(fname, trendSaveData, function (err) {
        if (err) {
            console.log(err);
        }
        trend.fileName = fname;
        if (callback) {
            callback();
        }
    });
}

async function SaveAsTrend(callback) {
    const options = {
        defaultPath: "./documents",
        filters: [{
                name: 'Trends',
                extensions: ['trd']
            },
            {
                name: 'All Files',
                extensions: ['*']
            }
        ]
    };
    const result = await dialog.showSaveDialog(null, options);
    if (result){
        trend.name = StripFileName(result.filePath);
        html_titleTrend.innerText = trend.name;
        SaveTrend(result.filePath);
    }
}

async function SelectTrend(callback) {
    const options = {
        defaultPath: "./documents",
        filters: [{
                name: 'Trends',
                extensions: ['trd']
            },
            {
                name: 'All Files',
                extensions: ['*']
            }
        ],
        properties: ['openFile']
    };
    const result = await dialog.showOpenDialog(null, options);
    if (result) {
        if (result.filePaths.length == 1) {
            LoadTrend(result.filePaths[0], () => {
                console.log(trend);
                trend.name = StripFileName(result.filePaths[0]);
                html_titleTrend.innerText = trend.name;
                ReloadPens();
                selectedPen = trend.pens[0].name;
                UpdateChart(() => {
                    SelectPen(selectedPen);
                });
            });
        }
    }
}

function ExportChart(exportData) {
    console.log(exportData);
    var penArray = GetPenArray();
    if (penArray.length > 0) {
        document.getElementById("msgAddaPen").classList.add("hide");
        document.getElementById("chart").classList.remove("hide");
        GetPenData(penArray, trend.startTime, trend.endTime, exportData.sampleRate, (err, result) => {
            ////console.log(result);
            ////console.log(result.recordset[0]);
            if (err) {
                ShowWarningMessageBox("Failed to get data. No CSV file created.");
            } else {
                var csvData = convertRecordSetToCSV({
                    data: result.recordset
                });
                ////console.log(csvData);

                fs.writeFile(exportData.fileName, csvData, function (err) {
                    if (err) {
                        return console.log(err);
                    }
                    ShowOKMessageBox("The CSV file was saved!");
                });
            }
        });
    }
}

function ChartResize(callback) {
    console.log("Resizing chart.")
    document.getElementById("chart").style.display = "none";
    chart.destroy();
    document.getElementById("chart").height = "50px";
    chart = new Chart(chartDoc, chartConfig);
    chart.resize();
    if (callback) {
        callback();
    }
}

function GetInterval() {
    var endTime = moment(trend.endTime, dateTimeFormat).toDate();
    var startTime = moment(trend.startTime, dateTimeFormat).toDate();
    var diff_secs = (moment(trend.endTime, dateTimeFormat).diff(moment(trend.startTime, dateTimeFormat))) / 1000;
    return diff_secs / numSamples;
}

function ShowExportWindow() {
    // Get the current window size and position.
    const pos = remote.getCurrentWindow().getPosition();
    const size = remote.getCurrentWindow().getSize();
    var xPos = pos[0] + (size[0] / 2) - 300;
    var yPos = pos[1] + (size[1] / 2) - 250;

    let win = new remote.BrowserWindow({
        parent: remote.getCurrentWindow(),
        ////frame: false,
        modal: true,
        resizable: false,
        width: 600,
        height: 250,
        x: xPos,
        y: yPos,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            webviewTag: true 
            }  
    });

    var theUrl = 'file://' + __dirname + '/app_Trend/export.html';
    console.log('url', theUrl);

    win.loadURL(theUrl);
    //win.webContents.openDevTools();
    win.setMenuBarVisibility(false);

    win.webContents.on('did-finish-load', () => {
        win.webContents.send('trendData', trend);
    });

    win.once('ready-to-show', () => {
        win.show();
    })


};

function UpdateChart(callback) {
    console.log("Calling get data");
    var penArray = GetPenArray();
    if (penArray.length > 0) {
        document.getElementById("msgAddaPen").classList.add("hide");
        document.getElementById("chart").classList.remove("hide");
        GetPenData(penArray, trend.startTime, trend.endTime, GetInterval(), (err, result) => {
            if (err) {
                ShowWarningMessageBox("Failed to get data.");
                return;
            }
            console.log(result);
            console.log(result.recordset[0]);
            var labels = [];
            result.recordset.forEach(record => {
                var multiLineLbl = record.time.split(" ");
                labels.push(multiLineLbl);
            });
            console.log(labels);
            var datasets = [];
            var yAxes = [];
            var x = 0;
            trend.pens.forEach(pen => {
                if ((pen.name != "Default") && (pen.name != "")) {
                    console.log("getting data for '" + pen.name + "'");
                    var data = [];
                    result.recordset.forEach(record => {
                        data.push(record[pen.name]);
                    });
                    var dataSet = {
                        label: pen.name,
                        data: data,
                        borderColor: pen.color,
                        borderWidth: ((pen.name == selectedPen) ? 3 : 1),
                        backgroundColor: pen.color,
                        fill: false,
                        yAxisID: pen.name,
                        pointRadius: 0,
                        steppedLine: true
                    };
                    datasets.push(dataSet);
                    var ticks = {};
                    if (pen.rangeAuto) {
                        ticks = {
                            fontColor: "white",
                        }
                    } else {
                        ticks = {
                            fontColor: "white",
                            min: pen.min,
                            max: pen.max
                        }
                    }
                    console.log("ticks=");
                    console.log(ticks);
                    var yAxis = {
                        id: pen.name,
                        display: (pen.name == selectedPen),
                        scaleLabel: {
                            fontColor: "white",
                            fontSize: 14,
                            display: true,
                            labelString: pen.description
                        },
                        gridLines: {
                            color: "#999999",
                            display: true
                        },
                        ticks: ticks,
                        afterDataLimits: (axis) => {
                            var pen = trend.pens.find(x => x.name === axis.id);
                            if (pen) {
                                if (pen.rangeAuto) {
                                    pen.min = axis.min;
                                    pen.max = axis.max;
                                }
                            }
                        }
                    };
                    yAxes.push(yAxis);
                    x += 1;
                }
            });

            chartConfig = {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                responsive: true,
                options: {
                    legend: {
                        display: false
                    },
                    animation: {
                        duration: 0
                    },
                    scales: {
                        xAxes: [{
                            gridLines: {
                                color: "#aaaaaa",
                                display: true
                            },
                            ticks: {
                                fontColor: "white",
                                maxTicksLimit: 7.1,
                                maxRotation: 0
                            }
                        }],
                        yAxes: yAxes
                    },
                    tooltips: {
                        mode: "index",
                        intersect: false
                    },
                    hover: {
                        mode: "index",
                        intersect: true
                    }
                }
            };

            ChartResize(() => {
                if (callback) {
                    console.log("Executing UpdateChart callback.");
                    callback();
                }
            });
            
        });

    } else {
        console.log("No pens... Hiding chart.");
        document.getElementById("msgAddaPen").classList.remove("hide");
        document.getElementById("chart").classList.add("hide");
    }
    document.getElementById("lblChartRange").innerText = GetTrendTimeRange();
};

//#endregion CHART FUNCTIONS

//#region PEN FUNCTIONS
function RemovePen(penName) {
    var targetPen = trend.pens.findIndex(x => x.name === penName);
    trend.pens.splice(targetPen, 1);
}

function ReloadPens() {
    ClearPenButtons();
    for (var i = 0; i < trend.pens.length; i++) {
        AddPenDiv(trend.pens[i]);
    }
}

function GetPenArray() {
    var penArray = [];
    trend.pens.forEach(pen => {
        if (pen.name != "Default") {
            penArray.push(pen.name);
        }
    });
    return penArray
}

// This function adds a pen to the pen collection and updates the chart.
function AddPen(Pen) {
    if (Pen) {
        Pen.color = penColors[penColorIndex];
        Pen.min = 0;
        Pen.max = 100;
        Pen.rangeAuto = true;
    }
    var found = false;
    trend.pens.forEach(penItem => {
        if (penItem.name == Pen.name) {
            found = true;
        }
    });
    if (!found) {
        trend.pens.push(Pen);
        AddPenDiv(Pen);
        UpdateChart(() => {
            SelectPen(Pen.name, () => {
                penColorIndex += 1;
            });
        });
    }
};

function HidePen(PenName) {

};

function SetPenRange(PenName, Min, Max, RangeAuto) {

};

function SelectPen(PenName, callback) {
    console.log("Executing SelectPen(" + PenName + ")");
    selectedPen = PenName;
    if (selectedPen != "") {
        var buttons = document.querySelectorAll(".btnPen");
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.remove("btnPen_selected");
        }
        var props = document.querySelectorAll(".btnProps");
        for (var i = 0; i < props.length; i++) {
            props[i].classList.remove("btnProps_selected");
        }
        var yAxis = {};
        chart.options.scales.yAxes.forEach(yAxis => {
            //yAxis.pointRadius = ((yAxis.id == selectedPen) ? 2 : 0);
            //yAxis.borderWidth = ((yAxis.id == selectedPen) ? 3 : 1);
            yAxis.display = (yAxis.id == selectedPen);
            console.log(yAxis.id + " setting display = " + yAxis.display);
            console.log(yAxis.id + " setting borderwidth = " + yAxis.borderWidth);
        });
        var dset = {};
        chart.data.datasets.forEach(dset => {
            dset.borderWidth = ((dset.label == selectedPen) ? 3 : 1);
            console.log(dset.label + " setting borderwidth = " + dset.borderWidth);
        });
        chart.update();
        document.getElementById(PenName).classList.add("btnPen_selected");
        document.getElementById(PenName + "_props").classList.add("btnProps_selected");
    }
    if (callback) {
        callback();
    }
};

function PickPen() {
    ShowPickPenWindow();
}

function ShowPickPenWindow() {

    // Get the current window size and position.
    const pos = remote.getCurrentWindow().getPosition();
    const size = remote.getCurrentWindow().getSize();
    var xPos = pos[0] + (size[0] / 2) - 300;
    var yPos = pos[1] + (size[1] / 2) - 250;

    loadSettingsfromFile(settingsFile, () => {
        var winWidth = 600;
        var winHeight = 500;
        console.log(settings);
        if (settings["pickPen"]) {
            winWidth = settings["pickPen"][0];
            winHeight = settings["pickPen"][1];
        }

        let win = new remote.BrowserWindow({
            parent: remote.getCurrentWindow(),
            ////frame: false,
            modal: true,
            width: winWidth,
            height: winHeight,
            x: xPos,
            y: yPos,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                webviewTag: true 
                }    
        });

        var theUrl = 'file://' + __dirname + '/app_Trend/pickPen.html'
        console.log('url', theUrl);

        win.loadURL(theUrl);
        //win.webContents.openDevTools();
        win.setMenuBarVisibility(false);

        win.webContents.on('did-finish-load', () => {
            win.webContents.send('penData', trend.pens.find(x => x.name === selectedPen));
        });

        win.once('ready-to-show', () => {
            win.show()
        });
    });
}

function ShowPenPropertiesWindow() {
    // Get the current window size and position.
    const pos = remote.getCurrentWindow().getPosition();
    const size = remote.getCurrentWindow().getSize();
    var xPos = pos[0] + (size[0] / 2) - 300;
    var yPos = pos[1] + (size[1] / 2) - 250;

    let win = new remote.BrowserWindow({
        parent: remote.getCurrentWindow(),
        ////frame: false,
        modal: true,
        resizable: false,
        width: 410,
        height: 360,
        x: xPos,
        y: yPos,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            webviewTag: true 
            }  
    });

    var theUrl = 'file://' + __dirname + '/app_Trend/penProperties.html'
    console.log('url', theUrl);

    win.loadURL(theUrl);
    //win.webContents.openDevTools();
    win.setMenuBarVisibility(false);

    win.webContents.on('did-finish-load', () => {
        win.webContents.send('penData', trend.pens.find(x => x.name === selectedPen));
    });

    win.once('ready-to-show', () => {
        win.show()
    });

}

//#endregion PEN FUNCTIONS

//#region TIME FUNCTIONS
function GetTrendTimeRange() {
    var timeRemaining = (moment(trend.endTime, dateTimeFormat).diff(moment(trend.startTime, dateTimeFormat))) / 1000;
    var s = timeRemaining % 60;
    timeRemaining = Math.trunc(timeRemaining / 60);
    var m = timeRemaining % 60;
    timeRemaining = Math.trunc(timeRemaining / 60);
    var h = timeRemaining % 24;
    var d = Math.trunc(timeRemaining / 24);
    var retTime = [];

    if (d > 0) {
        retTime.push(d + "d");
    }
    if (h > 0) {
        retTime.push(h + "h");
    }
    if (m > 0) {
        retTime.push(m + "m");
    }
    if (s > 0) {
        retTime.push(s + "s");
    }

    var retTimeRange = retTime.join(" ");
    console.log(retTimeRange);
    return retTimeRange;
}

function ShowPickTimeRangeWindow() {

    // Get the current window size and position.
    const pos = remote.getCurrentWindow().getPosition();
    const size = remote.getCurrentWindow().getSize();
    var xPos = pos[0] + (size[0] / 2) - 170;
    var yPos = pos[1] + (size[1] / 2) - 200;

    let win = new remote.BrowserWindow({
        parent: remote.getCurrentWindow(),
        ////frame: false,
        modal: true,
        width: 340,
        height: 450,
        resizable: false,
        x: xPos,
        y: yPos,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            webviewTag: true 
            }  
    });

    var theUrl = 'file://' + __dirname + '/app_Trend/pickTimeRange.html'
    console.log('url', theUrl);

    win.loadURL(theUrl);
    //win.webContents.openDevTools();
    win.setMenuBarVisibility(false);

    win.webContents.on('did-finish-load', () => {
        win.webContents.send('timeData', trend);
    });
    
    win.once('ready-to-show', () => {
        win.show()
    });

}

function ChangeStartTime(increment) {
    var newTime = moment(trend.startTime).add(increment, "seconds");
    if (moment(trend.endTime).diff(newTime) > 0) {
        trend.startTime = moment(newTime).format(dateTimeFormat);
        return true;
    } else {
        return false;
    }
}

function ChangeEndTime(increment) {
    var newTime = moment(trend.endTime).add(increment, "seconds");
    if (moment(newTime).diff(moment(trend.startTime)) > 0) {
        trend.endTime = moment(newTime).format(dateTimeFormat);
        return true;
    } else {
        return false;
    }
}
//#endregion TIME FUNCTIONS

//#region PRINT FUNCTIONS
function ShowPrintChartWindow() {
    // Get the current window size and position.
    const pos = remote.getCurrentWindow().getPosition();
    const size = remote.getCurrentWindow().getSize();
    var xPos = pos[0] + (size[0] / 2) - 400;
    var yPos = pos[1] + (size[1] / 2) - 300;

    let win = new remote.BrowserWindow({
        parent: remote.getCurrentWindow(),
        ////frame: false,
        modal: true,
        resizable: true,
        width: 800,
        height: 600,
        x: xPos,
        y: yPos,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            webviewTag: true 
            }
    });

    var theUrl = 'file://' + __dirname + '/app_Trend/pop_PrintChart.html'
    console.log('url', theUrl);

    win.loadURL(theUrl);
    //win.webContents.openDevTools();
    
    win.setMenuBarVisibility(false);

    win.webContents.on('did-finish-load', () => {
        win.webContents.send('printTrend', {trend:trend, selectedPen:selectedPen} );
    });

    win.once('ready-to-show', () => {
        win.show()
    });

}


//#endregion PRINT FUNCTIONS

//#region PAGE ANIMATION FUNCTIONS
function SelectNavInc(buttonId) {
    console.log("Time navigation increment selected = " + buttonId);
    var buttons = document.querySelectorAll(".btnNav");
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove("btnNav_selected");
    }
    document.getElementById(buttonId).classList.add("btnNav_selected");
}

// This function adds a pen button to the interface.
function AddPenDiv(Pen) {
    console.log("Adding pen:");
    console.log(Pen);
    var divBtn = "<div class='vbox btn btnPen btnComboLeft' id='" + Pen.name + "' ";
    divBtn += "title='" + Pen.description + "' ";
    //divBtn += "style='border-color:" + Pen.color + "' ";
    divBtn += "onclick='btnPen_onclick(event)'>" + Pen.name;
    divBtn += "<div class='btnPenColor' style='background-color:" + Pen.color + "'></div></div>";
    divBtn += "<div class='btn btnProps btnComboRight' id='" + Pen.name + "_props' "
    //divBtn += "style='border-color:" + Pen.color + "' ";
    divBtn += "data-pen='" + Pen.name + "' "; // This attribute will be used to get the pen name.
    divBtn += "title='Change properties' ";
    divBtn += "onclick='btnPenProps_onclick(event)'>...</div>";

    var penBtn = document.createElement("div");
    penBtn.innerText = Pen.name;
    penBtn.classList.add("hbox");
    penBtn.classList.add("stackVert");
    penBtn.classList.add("penButtons");
    penBtn.innerHTML = divBtn;

    document.getElementById("divPenButtons").appendChild(penBtn);
}

function ClearPenButtons() {
    var divButtons = document.getElementById("divPenButtons");
    while (divButtons.childElementCount > 1) {
        var btnPen = divButtons.lastChild;
        if (btnPen.id != "divAddPen") {
            divButtons.removeChild(divButtons.lastChild);
        }
    }
}

function RemovePenButton(penName) {
    console.log("Executing RemovePenButton....");
    var divButton = document.getElementById(penName).parentElement;
    divButton.remove();
}

//#endregion PAGE ANIMATION FUNCTIONS

//#region EVENT HANDLERS

//#region IPC EVENTS
ipc.on("pen", (event, message) => AddPen(message));

ipc.on("timedata", (event, message) => {
    trend.startTime = message.startTime;
    trend.endTime = message.endTime;
    UpdateChart();
});

ipc.on("penProps", (event, message) => {
    var targetPen = trend.pens.find(x => x.name === message.name);
    targetPen.rangeAuto = message.rangeAuto;
    targetPen.min = parseFloat(message.min);
    targetPen.max = parseFloat(message.max);
    UpdateChart();
});

ipc.on("removePen", (event, message) => {
    var penName = message.name;
    RemovePen(penName);
    RemovePenButton(penName);
    selectedPen = "";
    if (trend.pens.length > 0) {
        selectedPen = trend.pens[0].name;
    }
    UpdateChart();
    SelectPen(selectedPen);
});

ipc.on("exportdata", (event, message) => {
    /* exportdata Message format - 
       message = {
           fileName : <export filename>, 
           sampleRate: <seconds per sample>  
       }
    */
    ExportChart(message);
});


//#endregion IPC EVENTS

window.addEventListener("resize", () => {
    ChartResize();
});

document.getElementById("btnAddPen").addEventListener("click", () => {
    PickPen();
});

function btnPen_onclick(event) {
    SelectPen(event.target.id);
}

function btnPenProps_onclick(event) {
    SelectPen(event.target.getAttribute("data-pen"), () => {
        ShowPenPropertiesWindow();
    });
}

document.getElementById("lblChartRange").addEventListener("click", () => {
    ShowPickTimeRangeWindow();
});

document.getElementById("trend_btnTimes").addEventListener("click", () => {
    ShowPickTimeRangeWindow();
});

document.getElementById("trend_btnSave").addEventListener("click", () => {
    if (trend.name == "Untitled") {
        SaveAsTrend();
    } else {
        SaveTrend(trend.fileName);
    }
});

document.getElementById("trend_btnSaveAs").addEventListener("click", () => {
    SaveAsTrend();
});

document.getElementById("trend_btnOpen").addEventListener("click", () => {
    SelectTrend();
});

document.getElementById("trend_btnNew").addEventListener("click", () => {
    ClearTrend();
});

document.getElementById("trend_btnExport").addEventListener("click", () => {
    ShowExportWindow();
});

document.getElementById("trend_btnPrint").addEventListener("click", () => {
    ShowPrintChartWindow();
});


//#region NAV BUTTONS
document.getElementById("btnStartPast").addEventListener("click", () => {
    if (ChangeStartTime(-1 * navInc)) {
        UpdateChart();
    }
});

document.getElementById("btnStartFuture").addEventListener("click", () => {
    if (ChangeStartTime(navInc)) {
        UpdateChart();
    }
});

document.getElementById("btnPanPast").addEventListener("click", () => {
    if (ChangeStartTime(-1 * navInc)) {
        if (ChangeEndTime(-1 * navInc)) {
            UpdateChart();
        }
    }
});

document.getElementById("btnPanFuture").addEventListener("click", () => {
    if (ChangeEndTime(navInc)) {
        if (ChangeStartTime(navInc)) {
            UpdateChart();
        }
    }
});

document.getElementById("btnEndPast").addEventListener("click", () => {
    if (ChangeEndTime(-1 * navInc)) {
        UpdateChart();
    }
});

document.getElementById("btnEndFuture").addEventListener("click", () => {
    if (ChangeEndTime(navInc)) {
        UpdateChart();
    }
});

document.getElementById("btnNow").addEventListener("click", () => {
    var diff_secs = (moment(trend.endTime, dateTimeFormat).diff(moment(trend.startTime, dateTimeFormat))) / 1000;
    getNow((err, result) => {
        //trend.endTime = moment().format(dateTimeFormat);
        if (err) {
            ShowWarningMessageBox("Failed to get data.");
            return;
        }
        trend.endTime = result.recordset[0].Now;
        trend.startTime = moment(trend.endTime, dateTimeFormat).add(-1 * diff_secs, "seconds").format(dateTimeFormat);
        UpdateChart();
    });

    //trend.endTime = moment().format(dateTimeFormat);
    //trend.startTime = moment().add(-1 * diff_secs, "seconds").format(dateTimeFormat);
    //UpdateChart();
});

//#endregion NAV BUTTONS

//#region NAV INCREMENT SELECT BUTTONS
document.getElementById("btn10s").addEventListener("click", () => {
    navInc = 10;
    SelectNavInc("btn10s");
});
document.getElementById("btn1m").addEventListener("click", () => {
    navInc = 60;
    SelectNavInc("btn1m");
});
document.getElementById("btn10m").addEventListener("click", () => {
    navInc = 600;
    SelectNavInc("btn10m");
});
document.getElementById("btn1h").addEventListener("click", () => {
    navInc = 3600;
    SelectNavInc("btn1h");
});
document.getElementById("btn4h").addEventListener("click", () => {
    navInc = 4 * 60 * 60;
    SelectNavInc("btn4h");
});
document.getElementById("btn8h").addEventListener("click", () => {
    navInc = 8 * 60 * 60;
    SelectNavInc("btn8h");
});
document.getElementById("btn12h").addEventListener("click", () => {
    navInc = 12 * 60 * 60;
    SelectNavInc("btn12h");
});
document.getElementById("btn1d").addEventListener("click", () => {
    navInc = 24 * 60 * 60;
    SelectNavInc("btn1d");
});
document.getElementById("btn7d").addEventListener("click", () => {
    navInc = 7 * 24 * 60 * 60;
    SelectNavInc("btn7d");
});
//#endregion NAV INCREMENT SELECT BUTTONS

//#endregion EVENT HANDLERS

//#region HELPER FUNCTIONS
function StripFileName(fullName) {
    return fullName.substring(fullName.lastIndexOf("/") + 1);
}

function convertRecordSetToCSV(args) {
    var result, ctr, keys, columnDelimiter, lineDelimiter, data;

    data = args.data || null;
    if (data == null || !data.length) {
        return null;
    }

    columnDelimiter = args.columnDelimiter || ',';
    lineDelimiter = args.lineDelimiter || '\n';

    keys = Object.keys(data[0]);

    result = '';
    result += keys.join(columnDelimiter);
    result += lineDelimiter;

    data.forEach(function (item) {
        ctr = 0;
        keys.forEach(function (key) {
            if (ctr > 0) result += columnDelimiter;

            result += item[key];
            ctr++;
        });
        result += lineDelimiter;
    });

    return result;
}

//#endregion HELPER FUNCTIONS

//#region INITIALIZATION CODE
document.getElementById("lblChartRange").innerText = GetTrendTimeRange();
html_titleTrend.innerText = trend.name;
navInc = 600;
SelectNavInc("btn10m");
//#endregion INITIALIZATION CODE