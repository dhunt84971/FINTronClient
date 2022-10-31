"use strict";

const { app } = require("electron");

// Wrap the entire routine in an object that will be used as the name space for this script file.
// External references will be made using 'app_Trend.' and internal references will need to use 'this.'

let app_Trend = {

    //#region GLOBAL DECLARATIONS
    navInc: 600,
    chartConfig: {},
    /*
    let pen = 
        {
            name: "Default",
            description: "Default",
            units: "F",
            color: "#FFFFFF",
            type: 1,
            min: 0, // Y-Axis minimum.
            max: 100, // Y-Axis maximum.
            minValue: 0,
            maxValue: 100,
            startValue: 0,
            endValue: 100,
            avgValue: 50,
            rangeAuto: true,
            location: "Default",
            yAxisType: "linear",
            leftDispValue: "startVal",
            rightDispValue: "endVal"
        }];
    */
    numSamples: 2000,
    today: new Date(),
    nowString: moment().format(dateTimeFormat),
    tenMinsAgo: moment().add(-10, "minutes").format(dateTimeFormat),
    initialTrend: {
        fileName: DOCSDIR + "/Untitled.trd",
        name: "Untitled.trd",
        pens: [],
        startTime: moment().add(-10, "minutes").format(dateTimeFormat),
        endTime: moment().format(dateTimeFormat)
    },
    trend: {
        fileName: DOCSDIR + "/Untitled.trd",
        name: "Untitled.trd",
        pens: [],
        startTime: moment().add(-10, "minutes").format(dateTimeFormat),
        endTime: moment().format(dateTimeFormat)
    },
    penColors: [
        "#FF0000", //red
        "#00FFFF", //cyan
        "#00FF00", //lightgreen
        "#FFFF00", //yellow
        "#FF00FF", //magenta
        "#980000", //darkred
        "#00CCCC", //darkcyan
        "#009900", //darkgreen
        "#CCCC00", //darkyellow
        "#FF007F", //pink
        "#FF8000", //orange
        "#FFFFFF", //white
        "#C0C0C0", //gray
    ],
    penColorIndex: 0,
    chartDoc: {},
    html_titleTrend: {},
    chart: {},
    selectedPen: "",
    showPenDescriptionAs: "name",
    draggedPen: {},
    zoomprev_StartTime: "",
    zoomprev_EndTime: "",
    //#endregion GLOBAL DECLARATIONS

    //#region TREND FUNCTIONS
    saveTrendSettings: function () {
        let settings = {};
        appSettings.loadSettingsFromFile()
        .then((data)=>{
            settings = data;
            settings.trend = this.trend;
            return;
        })
        .then(()=>{
            return appSettings.setSettingsInFile(settings);
        })
        .catch((err)=>{console.log(err);});       
    },
    //#endregion TREND FUNCTIONS

    //#region CHART FUNCTIONS

    ClearTrend: function () {
        let nowString = moment().format(dateTimeFormat);
        let tenMinsAgo = moment().add(-10, "minutes").format(dateTimeFormat);

        this.trend = {
            name: "Untitled.trd",
            fileName: DOCSDIR + "/Untitled.trd",
            pens: [],
            startTime: tenMinsAgo,
            endTime: nowString
        };
        this.html_titleTrend.innerText = this.trend.name;
        this.chartConfig = {};
        this.chart.destroy();
        this.chart = new Chart(this.chartDoc, this.chartConfig);
        this.ReloadPens();
        this.UpdateChart();
    },

    LoadTrend: function (fname, tags, callback) {
        let trendLoaded = fs.readFileSync(fname);
        this.trend = JSON.parse(trendLoaded);
        this.trend.fileName = fname;
        for (let i=0; i<this.trend.pens.length; i++) {
            if (!tags.find(x=>x.Name == this.trend.pens[i].name)){
                globals.showWarningMessageBox(
                    `${this.trend.pens[i].name} - ${this.trend.pens[i].description} does not exist.\n\nThis pen will be removed.`);
                this.trend.pens.splice(i, 1);
                i--;
            }
        }
        if (callback) {
            callback();
        };
    },

    SaveTrend: function (fname, callback) {
        let trendSaveData = JSON.stringify(this.trend);
        fs.writeFile(fname, trendSaveData, (err)=> {
            if (err) {
                console.log(err);
            }
            this.trend.fileName = fname;
            if (callback) {
                callback();
            }
        });
    },

    SaveAsTrend: async function (callback) {
        const options = {
            defaultPath: DOCSDIR,
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
        if (result) {
            if (!result.canceled){
                let fName = result.filePath.endsWith(".trd") ? result.filePath : result.filePath + ".trd";
                this.trend.name = this.StripFileName(fName);
                this.html_titleTrend.innerText = this.trend.name;
                this.SaveTrend(fName);
                this.saveTrendSettings();
            }
        }

    },

    SelectTrend: async function (callback) {
        const options = {
            defaultPath: DOCSDIR,
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
            console.log(result);
            if (result.filePaths.length == 1 && !result.canceled) {
                db.getTags((err, data)=>{
                    let tags = data.recordset;
                    console.log(tags);
                    if (!err) {
                        this.LoadTrend(result.filePaths[0], tags, () => {
                            console.log(this.trend);
                            this.trend.name = this.StripFileName(result.filePaths[0]);
                            this.reloadTrend();
                        });
                    }
                    else {
                        console.log(err);
                    }
                });
            }
        }
    },

    reloadTrend: function () {
        this.html_titleTrend.innerText = this.trend.name;
        this.ReloadPens();
        if (this.trend.pens.length > 0){
            this.selectedPen = this.trend.pens[0].name;
            this.UpdateChart(() => {
                this.SelectPen(this.selectedPen);
            });
        }
        else{
            this.ClearTrend();
        }
    },

    exportChart: async function (exportData) {
        console.log(exportData);
        let penArray = this.GetPenArray();
        let penDescriptions = this.GetPenDescriptionArray();
        penDescriptions.unshift("Date Time");
        if (penArray.length > 0) {
            document.getElementById("trend_msgAddaPen").classList.add("hide");
            document.getElementById("trend_chart").classList.remove("hide");
            globals.showWaitImage();
            db.getHistory(penArray, this.trend.startTime, this.trend.endTime, exportData.sampleRate, (err, result) => {
                globals.hideWaitImage();
                if (err) {
                    globals.showWarningMessageBox("Failed to get data. No CSV file created.");
                } else {
                    let csvData = this.convertRecordSetToCSV({
                        data: result.recordset,
                        descriptions: penDescriptions
                    });
                    ////console.log(csvData);

                    fs.writeFile(exportData.fileName, csvData, function (err) {
                        if (err) {
                            return console.log(err);
                        }
                        globals.showOKMessageBox("The CSV file was saved!");
                    });
                }
            });
        }
    },

    ChartResize: function (callback) {
        console.log("Resizing chart.")
        document.getElementById("trend_chart").style.display = "none";
        this.chart.destroy();
        document.getElementById("trend_chart").height = "50px";
        this.chart = new Chart(this.chartDoc, this.chartConfig);
        this.chart.resize();
        if (callback) {
            callback();
        }
    },

    GetInterval: function () {
        let diff_secs = (moment(this.trend.endTime, dateTimeFormat).diff(moment(this.trend.startTime, dateTimeFormat))) / 1000;
        return diff_secs / this.numSamples;
    },

    ShowExportWindow: function () {
        // Get the current window size and position.
        const pos = remote.getCurrentWindow().getPosition();
        const size = remote.getCurrentWindow().getSize();
        let xPos = pos[0] + (size[0] / 2) - 300;
        let yPos = pos[1] + (size[1] / 2) - 250;

        let win = new remote.BrowserWindow({
            parent: remote.getCurrentWindow(),
            ////frame: false,
            modal: true,
            resizable: false,
            minimizable: false,
            width: 600,
            height: 250,
            x: xPos,
            y: yPos,
            show: false,
            useContentSize: true, // Needed to prevent electron issue #13043
            backgroundColor: "#fff",
            webPreferences: {
                nodeIntegration: true,
                enableRemoteModule: true,
            },
            icon: __dirname + '/images/chart.ico'
        });

        let theUrl = 'file://' + __dirname + '/app_Trend/export.html';
        console.log('url', theUrl);

        win.loadURL(theUrl);
        if (DEBUG_MODE) {
            win.webContents.openDevTools();
        }
        win.setMenuBarVisibility(false);

        win.webContents.on('did-finish-load', () => {
            win.webContents.send('trendData', this.trend);
        });

        win.once('ready-to-show', () => {
            win.show();
        });
    },

    UpdateChart: async function (callback) {
        console.log("Calling get data");
        let penArray = this.GetPenArray();
        if (penArray.length > 0) {
            this.saveTrendSettings();
            document.getElementById("trend_msgAddaPen").classList.add("hide");
            document.getElementById("trend_chart").classList.remove("hide");
            globals.showWaitImage();
            db.getHistory(penArray, this.trend.startTime, this.trend.endTime, this.GetInterval(), (err, result) => {
                globals.hideWaitImage();
                if (err) {
                    globals.showWarningMessageBox("Trend - Failed to get data.");
                    return;
                }
                console.log(result);
                console.log(result.recordset[0]);
                let labels = [];
                result.recordset.forEach(record => {
                    let multiLineLbl = record.time.split(" ");
                    labels.push(multiLineLbl);
                });
                console.log(labels);
                let datasets = [];
                let yAxes = [];
                let x = 0;
                this.trend.pens.forEach(pen => {
                    if ((pen.name != "Default") && (pen.name != "")) {
                        console.log("getting data for '" + pen.name + "'");
                        let data = [];
                        result.recordset.forEach(record => {
                            data.push(record[pen.name]);
                        });
                        let dataSet = {
                            label: pen.name,
                            data: data,
                            borderColor: pen.color,
                            borderWidth: ((pen.name == this.selectedPen) ? 3 : 1),
                            backgroundColor: pen.color,
                            fill: false,
                            yAxisID: pen.name,
                            pointRadius: 0,
                            steppedLine: true
                        };
                        datasets.push(dataSet);
                        let ticks = {};
                        this.AutoRangeDigitals();
                        if (pen.rangeAuto && pen.type != 1) {
                            ticks = {
                                fontColor: "white",
                                minor: {
                                    color: "red",
                                    display: true
                                }
                            }
                        } else {
                            ticks = {
                                fontColor: "white",
                                minor: {
                                    color: "red",
                                    display: true
                                },
                                min: pen.min,
                                max: pen.max
                            }
                        }
                        let yAxis = {
                            id: pen.name,
                            type: (pen.yAxisType)? pen.yAxisType : "linear",
                            display: (pen.name == this.selectedPen),
                            scaleLabel: {
                                fontColor: "white",
                                fontSize: 14,
                                display: false, // The y-axis label is now handled by the afterDraw plugin.
                                labelString: `${pen.description} (${pen.name})` 
                            },
                            gridLines: {
                                color: "#666666",
                                display: true,
                                drawBorder: true
                            },
                            ticks: ticks,
                            afterDataLimits: (axis) => {
                                let pen = this.trend.pens.find(x => x.name === axis.id);
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

                this.chartConfig = {
                    type: 'LineWithLine', //'line',
                    plugins:[{
                        afterDraw: chart => {
                            var ctx = chart.chart.ctx;
                            let y = 25;
                            let x = -1 * (ctx.canvas.clientWidth / 3.25);
                            let pen = this.trend.pens.find(x => x.name === this.selectedPen);
                            if (pen){
                                ctx.save();
                                ctx.font = "bold 14px";
                                ctx.fillStyle = "white";
                                ctx.rotate(-3.141/2);
                                ctx.textAlign = 'center';        
                                ctx.fillText(`${pen.description}`, x, y);
                                ctx.fillText(`[${pen.name}]`, x, y+15);
                                ctx.restore();
                            }
                        }
                      }],
                    data: {
                        labels: labels,
                        datasets: datasets
                    },
                    responsive: true,
                    options: {
                        legend: {
                            display: false
                        },
                        layout: {
                            padding: {
                                left: 50
                            }
                        },
                        animation: {
                            duration: 0
                        },
                        scales: {
                            xAxes: [{
                                gridLines: {
                                    color: "#aaaaaa",
                                    display: true,
                                    drawBorder: true
                                },
                                ticks: {
                                    fontColor: "white",
                                    maxTicksLimit: 7.04,
                                    maxRotation: 0,
                                    drawBorder: true
                                }
                            }],
                            yAxes: yAxes
                        },
                        tooltips: {
                            enabled: false,
                            mode: "index",
                            intersect: false,
                            position: "custom"
                        },
                        hover: {
                            mode: "index",
                            intersect: false,
                            animationDuration: 10
                        },
                    }
                };
                this.ChartResize(() => {
                    if (callback) {
                        console.log("Executing UpdateChart callback.");
                        callback();
                    }
                });
                this.UpdatePenValue(datasets);
            });

        } else {
            console.log("No pens... Hiding chart.");
            document.getElementById("trend_msgAddaPen").classList.remove("hide");
            document.getElementById("trend_chart").classList.add("hide");
        }
        document.getElementById("lblChartRange").innerText = this.GetTrendTimeRange();
    },
    //#endregion CHART FUNCTIONS

    //#region PEN FUNCTIONS
    AutoRangeDigitals: function() {
        let pens = this.trend.pens.filter(x=>x.type == 1 && x.rangeAuto);
        console.log({digitalPens: pens});
        console.log(pens.length);
        if (pens.length > 0){
            let maxRange = (2 * pens.length) + 1;
            if (maxRange < 7) maxRange = 7;
            let i = 0;
            for (let pen of pens){
                pen.min = -1 - (2*i);
                pen.max = pen.min + maxRange;
                i += 1;
                console.log(i);
                console.log(pen.min);
                console.log(pen.max);
            }
        }
    },

    ApplyRangeToUnits: function (srcPen) {
        // This function applies the passed pen's manual range to all pens with the same units.
        let pens = this.trend.pens.filter(x=>x.units == srcPen.units);
        for (let pen of pens){
            pen.min = parseFloat(srcPen.min);
            pen.max = parseFloat(srcPen.max);
            pen.rangeAuto = false;
        }
    },

    RemovePen: function (penName) {
        let targetPen = this.trend.pens.findIndex(x => x.name === penName);
        this.trend.pens.splice(targetPen, 1);
    },

    ModifyPen: function (srcPen) {
        let targetPen = this.trend.pens.find(x => x.name === srcPen.name);
        targetPen.rangeAuto = srcPen.rangeAuto;
        targetPen.min = parseFloat(srcPen.min);
        targetPen.max = parseFloat(srcPen.max);
        targetPen.yAxisType = srcPen.yAxisType;
        targetPen.color = srcPen.color;
        document.getElementById(targetPen.name + "_color").style.backgroundColor = targetPen.color;
    },

    ReloadPens: function () {
        this.ClearPenButtons();
        for (let i = 0; i < this.trend.pens.length; i++) {
            this.AddPenDiv(this.trend.pens[i]);
        }
    },

    GetPenArray: function () {
        let penArray = [];
        this.trend.pens.forEach(pen => {
            if (pen.name != "Default") {
                penArray.push(pen.name);
            }
        });
        return penArray;
    },

    GetPenDescriptionArray: function (){
        let penArray = [];
        this.trend.pens.forEach(pen => {
            if (pen.name != "Default") {
                penArray.push(pen.description);
            }
        });
        return penArray;
    },

    // This function adds a pen to the pen collection and updates the chart.
    AddPen: function (Pen) {
        if (Pen) {
            Pen.color = this.AutoColor();
            Pen.min = 0;
            Pen.max = 100;
            Pen.rangeAuto = true;
            Pen.yAxisType = "linear";
        }
        let found = false;
        this.trend.pens.forEach(penItem => {
            if (penItem.name == Pen.name) {
                found = true;
            }
        });
        if (!found) {
            this.trend.pens.push(Pen);
            this.AddPenDiv(Pen);
            this.UpdateChart(() => {
                this.SelectPen(Pen.name);
            });
        }
    },

    AutoColor: function (){
        for (var idx = 0; idx<this.penColors.length; idx++){
            var found = false;
            for (var x = 0; x<this.trend.pens.length; x++){
                if (this.trend.pens[x].color.toLowerCase() == this.penColors[idx].toLowerCase()){
                    found = true;
                    break;
                }
            }
            if (!found) return this.penColors[idx];
        }
        
        return "#FFFFFF";
    },

    HidePen: function (PenName) {

    },

    SetPenRange: function (PenName, Min, Max, RangeAuto) {

    },

    AutoFormat: function (value, maxFigures){
        console.log("Value = " + value);
        if (isNaN(value) || value == null){
            return "---";
        }
        else{
            if (value == true){
                return 1;
            }
            else if (value == false){
                return 0;
            }
            else if (value < Math.pow(10, (-1*maxFigures))){
                return value.toExponential(maxFigures);
            }
            else if (value < 1){
                return value.toFixed(maxFigures);
            }
            else if (value > Math.pow(10, maxFigures)){
                return value.toFixed(0);
            }
            else{
                return value.toPrecision(maxFigures);
            }
        }
    },
    
    UpdatePenValue: function (datasets){
        datasets.forEach(dset => {
            var pen = this.trend.pens.find(x => x.name === dset.label);
            pen.startValue = this.AutoFormat(dset.data[0], 5);
            document.getElementById(pen.name + "_leftValue").innerHTML = pen.startValue;
            pen.endValue = this.AutoFormat(dset.data[dset.data.length-1], 5);
            document.getElementById(pen.name + "_rightValue").innerHTML = pen.endValue;
        });
    },

    SelectPen: function (PenName, callback) {
        console.log("Executing SelectPen(" + PenName + ")");
        this.selectedPen = PenName;
        if (this.selectedPen != "") {
            let buttons = document.querySelectorAll(".trend_btnPen");
            for (let i = 0; i < buttons.length; i++) {
                buttons[i].classList.remove("trend_btnPen_selected");
            }
            let props = document.querySelectorAll(".trend_btnProps");
            for (let i = 0; i < props.length; i++) {
                props[i].classList.remove("trend_btnProps_selected");
            }
            let yAxis = {};
            this.chart.options.scales.yAxes.forEach(yAxis => {
                //yAxis.pointRadius = ((yAxis.id == this.selectedPen) ? 2 : 0);
                //yAxis.borderWidth = ((yAxis.id == this.selectedPen) ? 3 : 1);
                yAxis.display = (yAxis.id == this.selectedPen);
                console.log(yAxis.id + " setting display = " + yAxis.display);
                console.log(yAxis.id + " setting borderwidth = " + yAxis.borderWidth);
            });
            let dset = {};
            this.chart.data.datasets.forEach(dset => {
                dset.borderWidth = ((dset.label == this.selectedPen) ? 3 : 1);
                console.log(dset.label + " setting borderwidth = " + dset.borderWidth);
            });
            this.chart.update();
            document.getElementById(PenName).classList.add("trend_btnPen_selected");
            document.getElementById(PenName + "_props").classList.add("trend_btnProps_selected");
        }
        if (callback) {
            callback();
        }
    },

    PickPen: function () {
        this.ShowPickPenWindow();
    },

    ShowPickPenWindow: function () {
        // Get the current window size and position.
        const pos = remote.getCurrentWindow().getPosition();
        const size = remote.getCurrentWindow().getSize();
        let xPos = pos[0] + (size[0] / 2) - 300;
        let yPos = pos[1] + (size[1] / 2) - 250;
        appSettings.loadSettingsFromFile((err, settings) => {
            let winWidth = 600;
            let winHeight = 500;
            console.log(settings);
            if (settings.pickPen) {
                winWidth = settings.pickPen[0];
                winHeight = settings.pickPen[1];
                console.log(winWidth + ", " + winHeight);
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
                useContentSize: true, // Needed to prevent electron issue #13043
                backgroundColor: "#fff",
                webPreferences: {
                    nodeIntegration: true,
                    enableRemoteModule: true,
                },
                icon: __dirname + '/images/chart.ico'
            });

            let theUrl = 'file://' + __dirname + '/app_Trend/pickPen.html';
            console.log('url', theUrl);

            win.loadURL(theUrl);
            if (DEBUG_MODE) {
                win.webContents.openDevTools();
            }
            win.setMenuBarVisibility(false);

            win.webContents.on('did-finish-load', () => {
                win.webContents.send('penData', this.trend.pens.find(x => x.name === this.selectedPen));
            });

            win.once('ready-to-show', () => {
                win.show();
            });
        });
    },

    ShowPenPropertiesWindow: async function () {
        // Get the current window size and position.
        const pos = remote.getCurrentWindow().getPosition();
        const size = remote.getCurrentWindow().getSize();
        const winHeight = 520;
        const winWidth = 410;
        let xPos = pos[0] + (size[0] / 2) - (winWidth/2);
        let yPos = pos[1] + (size[1] / 2) - (winHeight/2);

        let win = new remote.BrowserWindow({
            parent: remote.getCurrentWindow(),
            ////frame: false,
            modal: true,
            resizable: false,
            minimizable: false,
            width: winWidth,
            height: winHeight,
            x: xPos,
            y: yPos,
            show: false,
            useContentSize: true, // Needed to prevent electron issue #13043
            backgroundColor: "#fff",
            webPreferences: {
                nodeIntegration: true,
                enableRemoteModule: true,
            },
            icon: __dirname + '/images/chart.ico'
        });

        let theUrl = 'file://' + __dirname + '/app_Trend/penProperties.html';
        console.log('url', theUrl);

        win.loadURL(theUrl);
        if (DEBUG_MODE) {
            win.webContents.openDevTools();
        }
        win.setMenuBarVisibility(false);

        win.webContents.on('did-finish-load', async () => {
            globals.showWaitImage();
            db.getTagDescription(this.selectedPen, (err, result) => {
                globals.hideWaitImage();
                var penData = this.trend.pens.find(x => x.name === this.selectedPen);
                penData.description = result.Description;
                win.webContents.send('penData', this.trend.pens.find(x => x.name === this.selectedPen));
            });
        });

        win.once('ready-to-show', () => {
            win.show();
        });

    },

    MovePen: function(targetEl){
        // This function re-orders the pens moving the dragged pen 
        // after the target element referenced pen.
        if (this.draggedPen != undefined){
            // Get the index of the targetEl.
            let targetPenName = targetEl.getAttribute("data-pen");
            let targetIndex = targetPenName === "__MOVETOP" ? -1 :
                this.trend.pens.findIndex(x=>x.name === targetPenName);

            // Get the index of the source pen.
            let sourcePenName = this.draggedPen.getAttribute("data-pen");
            let sourceIndex = this.trend.pens.findIndex(x=>x.name === sourcePenName);
            let sourcePen = this.trend.pens[sourceIndex];
            this.trend.pens.splice(sourceIndex, 1);
            this.trend.pens.splice(targetIndex + 1, 0, sourcePen);
            this.ReloadPens();
            this.saveTrendSettings();
        }
    },

    //#endregion PEN FUNCTIONS

    //#region TIME FUNCTIONS
    GetTrendTimeRange: function () {
        let timeRemaining = (moment(this.trend.endTime, dateTimeFormat).diff(moment(this.trend.startTime, dateTimeFormat))) / 1000;
        let s = timeRemaining % 60;
        timeRemaining = Math.trunc(timeRemaining / 60);
        let m = timeRemaining % 60;
        timeRemaining = Math.trunc(timeRemaining / 60);
        let h = timeRemaining % 24;
        let d = Math.trunc(timeRemaining / 24);
        let retTime = [];

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

        let retTimeRange = retTime.join(" ");
        console.log(retTimeRange);
        return retTimeRange;
    },

    ShowPickTimeRangeWindow: function () {

        // Get the current window size and position.
        const pos = remote.getCurrentWindow().getPosition();
        const size = remote.getCurrentWindow().getSize();
        let xPos = pos[0] + (size[0] / 2) - 170;
        let yPos = pos[1] + (size[1] / 2) - 200;

        let win = new remote.BrowserWindow({
            parent: remote.getCurrentWindow(),
            ////frame: false,
            modal: true,
            width: 340,
            height: 450,
            resizable: false,
            minimizable: false,
            x: xPos,
            y: yPos,
            show: false,
            useContentSize: true, // Needed to prevent electron issue #13043
            backgroundColor: "#fff",
            webPreferences: {
                nodeIntegration: true,
                enableRemoteModule: true,
            },
            icon: __dirname + '/images/chart.ico'
        });

        let theUrl = 'file://' + __dirname + '/app_Trend/pickTimeRange.html';
        console.log('url', theUrl);

        win.loadURL(theUrl);
        if (DEBUG_MODE) {
            win.webContents.openDevTools();
        }

        win.setMenuBarVisibility(false);

        win.webContents.on('did-finish-load', () => {
            win.webContents.send('timeData', this.trend);
        });

        win.once('ready-to-show', () => {
            win.show();
        });

    },

    ChangeStartTime: function (increment) {
        let newTime = moment(this.trend.startTime).add(increment, "seconds");
        if (moment(this.trend.endTime).diff(newTime) > 0) {
            this.trend.startTime = moment(newTime).format(dateTimeFormat);
            return true;
        } else {
            return false;
        }
    },

    ChangeEndTime: function (increment) {
        let newTime = moment(this.trend.endTime).add(increment, "seconds");
        if (moment(newTime).diff(moment(this.trend.startTime)) > 0) {
            this.trend.endTime = moment(newTime).format(dateTimeFormat);
            return true;
        } else {
            return false;
        }
    },
    //#endregion TIME FUNCTIONS

    //#region PRINT FUNCTIONS
    ShowPrintChartWindow: function () {
        // Get the current window size and position.
        const pos = remote.getCurrentWindow().getPosition();
        const size = remote.getCurrentWindow().getSize();
        var xPos = pos[0] + (size[0] / 2) - 545;
        var yPos = pos[1] + (size[1] / 2) - 350;

        let win = new remote.BrowserWindow({
            //parent: remote.getCurrentWindow(),
            ////frame: false,
            //modal: true,
            resizable: true,
            width: 1090,
            height: 700,
            x: xPos,
            y: yPos,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                webviewTag: true,
                enableRemoteModule: true,
                },
            icon: __dirname + '/images/chart.ico'   
        });

        var theUrl = 'file://' + __dirname + '/app_Trend/pop_PrintChart.html'
        console.log('url', theUrl);

        win.loadURL(theUrl);
        if (DEBUG_MODE){
            win.webContents.openDevTools();
        }
        
        win.setMenuBarVisibility(false);

        win.webContents.on('did-finish-load', () => {
            win.webContents.send('printTrend', {trend:this.trend, selectedPen:this.selectedPen} );
        });

        win.once('ready-to-show', () => {
            win.show()
        });

    },
    //#endregion PRINT FUNCTIONS

    //#region PAGE ANIMATION FUNCTIONS
    SelectNavInc: function (buttonId) {
        console.log("Time navigation increment selected = " + buttonId);
        let buttons = document.querySelectorAll(".trend_btnNav");
        for (let i = 0; i < buttons.length; i++) {
            buttons[i].classList.remove("trend_btnNav_selected");
        }
        document.getElementById(buttonId).classList.add("trend_btnNav_selected");
    },

    // This function adds a pen button to the interface.
    AddPenDiv: function (Pen) {
        console.log("Adding pen:");
        console.log(Pen);
        let btnWidth = this.showPenDescriptionAs=="name"? "180px" : "180px";
        let btnText = this.showPenDescriptionAs=="name"? Pen.name : Pen.description;
        let penUnits = Pen.units ? `<div class='trend_btnPenUnits' data-pen='${Pen.name}' 
            id='${Pen.name}_units'>${Pen.units}
            </div>` : "";
        let divBtn = `
            <div class='vbox trend_btn trend_btnPen trend_btnComboLeft' style='width:${btnWidth}' 
                data-pen='${Pen.name}' id='${Pen.name}' title='${Pen.name}\n${Pen.description}'
                onclick='trend_btnPen_onclick("${Pen.name}")'>
                <div class='ellipsisWrap' data-pen='${Pen.name}'>
                    <div class='ellipsisText'
                        data-pen='${Pen.name}'>${btnText}
                    </div>
                </div>
                <div class='trend_btnPenColor' data-pen='${Pen.name}' 
                    id='${Pen.name}_color' style='background-color:${Pen.color}' >
                </div>
                <div class='hbox noPadding noMargin' data-pen='${Pen.name}'>
                    <div class='trend_btnPenLeftValue' data-pen='${Pen.name}' 
                        id='${Pen.name}_leftValue'>
                        ${Pen.startValue}
                    </div>
                    <div class='hboxFill noPadding noMargin' data-pen='${Pen.name}'>
                    </div>
                    <div class='trend_btnPenValue hide' data-pen='${Pen.name}' 
                        id='${Pen.name}_value' >
                    </div>
                    ${penUnits}
                    <div class='hboxFill noPadding noMargin' data-pen='${Pen.name}'>
                    </div>
                    <div class='trend_btnPenRightValue' data-pen='${Pen.name}' 
                        id='${Pen.name}_rightValue' >
                        ${Pen.endValue}
                    </div>
                </div>
            </div>
            <div class='trend_btn trend_btnProps trend_btnComboRight' id='${Pen.name}_props'
                data-pen='${Pen.name}' title='Change properties' 
                onclick='trend_btnPenProps_onclick("${Pen.name}")'>...
            </div>
            `;
        let penBtn = document.createElement("div");
        penBtn.classList.add("hbox");
        //penBtn.classList.add("stackVert");
        penBtn.classList.add("trend_penButtons");
        penBtn.setAttribute("draggable", "true");
        penBtn.setAttribute("data-pen", Pen.name);
        penBtn.innerHTML = divBtn;
        let penVSpacer = document.createElement("div");
        penVSpacer.classList.add("trend_pen_spacer");
        penVSpacer.setAttribute("data-pen", Pen.name);
        penVSpacer.setAttribute("id", Pen.name + "_spacer");
        document.getElementById("divPenButtons").appendChild(penBtn);
        document.getElementById("divPenButtons").appendChild(penVSpacer);
    },

    ClearPenButtons: function () {
        let divButtons = document.getElementById("divPenButtons");
        while (divButtons.childElementCount > 2) {
            let btnPen = divButtons.lastChild;
            if (btnPen.id != "divAddPen" && btnPen.id != "divPenDropTop") {
                divButtons.removeChild(divButtons.lastChild);
            }
        }
    },

    RemovePenButton: function (penName) {
        console.log("Executing RemovePenButton....");
        let divButton = document.getElementById(penName).parentElement;
        divButton.remove();
        let divSpacer = document.getElementById(penName + "_spacer");
        divSpacer.remove();
    },

    togglePenNames: function (){
        this.showPenDescriptionAs = this.showPenDescriptionAs == "name" ? "description" : "name";
        appSettings.setSettingInFile("showPenDescriptionAs", this.showPenDescriptionAs);
        if (this.showPenDescriptionAs == "name") this.showPenNames();
        if (this.showPenDescriptionAs == "description") this.showPenDescriptions();
    },

    showPenNames: function (){
        let penTextEls = document.querySelectorAll("div [class='ellipsisText'][data-pen]");
        for (let el of penTextEls){
            let penName = el.getAttribute("data-pen");
            let pen = this.trend.pens.find(x=>x.name == penName);
            if (pen) el.innerText=pen.name;
        }
        let penButtonEls = document.querySelectorAll("div [class~='trend_btnPen'][data-pen]");
        for (let el of penButtonEls){
            el.style.width = "180px";
        }
        trend_btnAddPen.style.width = "168px";
        this.ChartResize();
    },

    showPenDescriptions: function (){
        let penTextEls = document.querySelectorAll("div [class='ellipsisText'][data-pen]");
        for (let el of penTextEls){
            let penName = el.getAttribute("data-pen");
            let pen = this.trend.pens.find(x=>x.name == penName);
            if (pen) el.innerText=pen.description;
        }
        let penButtonEls = document.querySelectorAll("div [class~='trend_btnPen'][data-pen]");
        for (let el of penButtonEls){
            el.style.width = "180px";
        }
        trend_btnAddPen.style.width = "168px";
        this.ChartResize();
    },

    showPenCursorValues: function (index){
        let penTextEls = document.querySelectorAll("div [class='ellipsisText'][data-pen]");
        for (let el of penTextEls){
            let penName = el.getAttribute("data-pen");
            globals.hideById(`${penName}_leftValue`);
            globals.hideById(`${penName}_rightValue`);
            globals.showById(`${penName}_value`);
            let penValEl = document.getElementById(`${penName}_value`);
            let penData = this.chart.data.datasets.find(x=>x.label == penName);
            if (penData){
                penValEl.innerHTML = this.AutoFormat(penData.data[index], 5);
            }
        }
    },

    hidePenCursorValues: function (){
        let penTextEls = document.querySelectorAll("div [class='ellipsisText'][data-pen]");
        for (let el of penTextEls){
            let penName = el.getAttribute("data-pen");
            let pen = this.trend.pens.find(x=>x.name == penName);
            globals.showById(`${penName}_leftValue`);
            globals.showById(`${penName}_rightValue`);
            globals.hideById(`${penName}_value`);
            let penValEl = document.getElementById(`${penName}_value`);
            if (penValEl && pen){
                penValEl.innerHTML = pen.endValue; 
            }
        }
    },

    //#endregion PAGE ANIMATION FUNCTIONS

    //#region HELPER FUNCTIONS
    StripFileName: function (fullName) {
        return fullName.substring(fullName.lastIndexOf("/") + 1);
    },

    convertRecordSetToCSV: function (args) {
        let result, ctr, keys, columnDelimiter, lineDelimiter, data, descriptions;

        data = args.data || null;
        if (data == null || !data.length) {
            return null;
        }

        columnDelimiter = args.columnDelimiter || ',';
        lineDelimiter = args.lineDelimiter || '\n';
        descriptions = args.descriptions || null;

        keys = Object.keys(data[0]);

        result = '';
        // Create the Description Column Headers.
        if (descriptions != null && descriptions.length > 0){
            result += descriptions.join(columnDelimiter);
            result += lineDelimiter;
        }

        // Create the ColumnHeader.
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
    },

    //#endregion HELPER FUNCTIONS

    //#region INITIALIZATION CODE
    init: function () {
        this.chartDoc = document.getElementById("trend_chart").getContext("2d");
        this.html_titleTrend = document.getElementById("trend_titleTrend");
        this.chart = new Chart(this.chartDoc, this.chartConfig);

        document.getElementById("lblChartRange").innerText = this.GetTrendTimeRange();
        this.html_titleTrend.innerText = this.trend.name;
        this.navInc = 600;
        this.SelectNavInc("btn10m");
        appSettings.getSettingInFile("showPenDescriptionAs", "name")
        .then((value) => {
            this.showPenDescriptionAs = value;
            if (this.showPenDescriptionAs == "name") this.showPenNames();
            if (this.showPenDescriptionAs == "description") this.showPenDescriptions();    
        })
        .catch(()=>{});  // Ignore any errors.  They will be handled elsewhere.
    },
    //#endregion INITIALIZATION CODE
};

//#region EVENT HANDLERS

//#region IPC EVENTS
ipc.on("pen", (event, message) => app_Trend.AddPen(message));

ipc.on("timedata", (event, message) => {
    app_Trend.trend.startTime = message.startTime;
    app_Trend.trend.endTime = message.endTime;
    app_Trend.UpdateChart();
});

ipc.on("penProps", (event, message) => {
    let pen = message.pen;
    console.log(pen);
    app_Trend.ModifyPen(pen);
    if (message.options.applyRangeToUnits){
        app_Trend.ApplyRangeToUnits(pen);
    }
    app_Trend.UpdateChart();
});

ipc.on("removePen", (event, message) => {
    let penName = message.name;
    app_Trend.RemovePen(penName);
    app_Trend.RemovePenButton(penName);
    app_Trend.selectedPen = "";
    if (app_Trend.trend.pens.length > 0) {
        app_Trend.selectedPen = app_Trend.trend.pens[0].name;
    }
    app_Trend.UpdateChart();
    app_Trend.SelectPen(app_Trend.selectedPen);
});

ipc.on("exportdata", (event, message) => {
    /*exportdata Message format - 
    message = {
        fileName : <export filename>, 
        sampleRate: <seconds per sample>  
    }
    */
    app_Trend.exportChart(message);
});


//#endregion IPC EVENTS

window.addEventListener("resize", () => {
    app_Trend.ChartResize();
});

//#region PEN EVENTS
document.getElementById("trend_btnAddPen").addEventListener("click", () => {
    app_Trend.PickPen();
});

trend_btnPenName.addEventListener("click", ()=>{
    app_Trend.togglePenNames();
});

function trend_btnPen_onclick(penName) {
    console.log(event.target);
    app_Trend.SelectPen(penName);
}

function trend_btnPenProps_onclick(penName) {
    app_Trend.SelectPen(penName, () => {
        app_Trend.ShowPenPropertiesWindow();
    });
}
//#endregion PEN EVENTS

//#region TREND TOOLBAR BUTTONS
document.getElementById("lblChartRange").addEventListener("click", () => {
    app_Trend.ShowPickTimeRangeWindow();
});

document.getElementById("trend_btnTimes").addEventListener("click", () => {
    app_Trend.ShowPickTimeRangeWindow();
});

document.getElementById("trend_btnSave").addEventListener("click", () => {
    if (app_Trend.trend.name == "Untitled.trd") {
        app_Trend.SaveAsTrend();
    } else {
        app_Trend.SaveTrend(app_Trend.trend.fileName);
    }
});

document.getElementById("trend_btnSaveAs").addEventListener("click", () => {
    app_Trend.SaveAsTrend();
});

document.getElementById("trend_btnOpen").addEventListener("click", () => {
    app_Trend.SelectTrend();
});

document.getElementById("trend_btnNew").addEventListener("click", () => {
    app_Trend.ClearTrend();
});

document.getElementById("trend_btnExport").addEventListener("click", () => {
    app_Trend.ShowExportWindow();
});

document.getElementById("trend_btnPrint").addEventListener("click", () => {
    app_Trend.ShowPrintChartWindow();
});

//#endregion TREND TOOLBAR BUTTONS

//#region NAV BUTTONS
document.getElementById("btnStartPast").addEventListener("click", () => {
    if (app_Trend.ChangeStartTime(-1 * app_Trend.navInc)) {
        app_Trend.UpdateChart();
    }
});

document.getElementById("btnStartFuture").addEventListener("click", () => {
    if (app_Trend.ChangeStartTime(app_Trend.navInc)) {
        app_Trend.UpdateChart();
    }
});

document.getElementById("btnPanPast").addEventListener("click", () => {
    if (app_Trend.ChangeStartTime(-1 * app_Trend.navInc)) {
        if (app_Trend.ChangeEndTime(-1 * app_Trend.navInc)) {
            app_Trend.UpdateChart();
        }
    }
});

document.getElementById("btnPanFuture").addEventListener("click", () => {
    if (app_Trend.ChangeEndTime(app_Trend.navInc)) {
        if (app_Trend.ChangeStartTime(app_Trend.navInc)) {
            app_Trend.UpdateChart();
        }
    }
});

document.getElementById("btnEndPast").addEventListener("click", () => {
    if (app_Trend.ChangeEndTime(-1 * app_Trend.navInc)) {
        app_Trend.UpdateChart();
    }
});

document.getElementById("btnEndFuture").addEventListener("click", () => {
    if (app_Trend.ChangeEndTime(app_Trend.navInc)) {
        app_Trend.UpdateChart();
    }
});

document.getElementById("btnNow").addEventListener("click", async () => {
    let diff_secs = (moment(app_Trend.trend.endTime, dateTimeFormat).diff(moment(app_Trend.trend.startTime, dateTimeFormat))) / 1000;
    db.getNow((err, result) => {
        //trend.endTime = moment().format(dateTimeFormat);
        if (err) {
            globals.showWarningMessageBox("Trend - Failed to get data.");
            return;
        }
        app_Trend.trend.endTime = result.recordset[0].Now;
        app_Trend.trend.startTime = moment(app_Trend.trend.endTime, dateTimeFormat).add(-1 * diff_secs, "seconds").format(dateTimeFormat);
        app_Trend.UpdateChart();
    });

});

//#endregion NAV BUTTONS

//#region NAV INCREMENT SELECT BUTTONS
document.getElementById("btn10s").addEventListener("click", () => {
    app_Trend.navInc = 10;
    app_Trend.SelectNavInc("btn10s");
});
document.getElementById("btn1m").addEventListener("click", () => {
    app_Trend.navInc = 60;
    app_Trend.SelectNavInc("btn1m");
});
document.getElementById("btn10m").addEventListener("click", () => {
    app_Trend.navInc = 600;
    app_Trend.SelectNavInc("btn10m");
});
document.getElementById("btn1h").addEventListener("click", () => {
    app_Trend.navInc = 3600;
    app_Trend.SelectNavInc("btn1h");
});
document.getElementById("btn4h").addEventListener("click", () => {
    app_Trend.navInc = 4 * 60 * 60;
    app_Trend.SelectNavInc("btn4h");
});
document.getElementById("btn8h").addEventListener("click", () => {
    app_Trend.navInc = 8 * 60 * 60;
    app_Trend.SelectNavInc("btn8h");
});
document.getElementById("btn12h").addEventListener("click", () => {
    app_Trend.navInc = 12 * 60 * 60;
    app_Trend.SelectNavInc("btn12h");
});
document.getElementById("btn1d").addEventListener("click", () => {
    app_Trend.navInc = 24 * 60 * 60;
    app_Trend.SelectNavInc("btn1d");
});
document.getElementById("btn7d").addEventListener("click", () => {
    app_Trend.navInc = 7 * 24 * 60 * 60;
    app_Trend.SelectNavInc("btn7d");
});
//#endregion NAV INCREMENT SELECT BUTTONS

//#region PEN DRAG AND DROP
document.addEventListener("dragstart", (e)=>{
    e.target.style.opacity = .5;
    let el = e.target;
    if (el.classList.contains("trend_penButtons")){
        app_Trend.draggedPen = el;
    }
});

document.addEventListener("dragend", (e)=> {
    // reset the transparency
    e.target.style.opacity = "";
});

document.addEventListener("dragenter", (e)=> {
    // highlight potential drop target when the draggable element enters it.
    let el = e.target;
    if (el.classList.contains("trend_pen_spacer")){
        el.classList.add("trend_dragTarget");
    }
});

document.addEventListener("dragleave", (e)=> {
    // reset background of potential drop target when the draggable element leaves it.
    let el = e.target;
    if (el.classList.contains("trend_pen_spacer")){
        el.classList.remove("trend_dragTarget");
    }
});

document.addEventListener("dragover", (e)=> {
    // prevent default to allow drop
    e.preventDefault();
});

document.addEventListener("drop", (e)=> {
    // move dragged elem to the selected drop target.
    let el = e.target;
    if (el.classList.contains("trend_pen_spacer")){
        el.classList.remove("trend_dragTarget");
        app_Trend.MovePen(el);
    }
    // prevent default action.
    e.preventDefault();    
});
////#endregion PEN DRAG AND DROP

//#endregion EVENT HANDLERS

app_Trend.init();

//#region CHART CONTEXT MENU
function trend_ZoomPrev() {
    app_Trend.trend.startTime = app_Trend.zoomprev_StartTime;
    app_Trend.trend.endTime = app_Trend.zoomprev_EndTime;
    // Redraw the chart.
    app_Trend.UpdateChart();
};

document.getElementById("trend_chart").addEventListener("contextmenu", (e) => {
    console.log(e.clientX);
    var menu = document.getElementById("chartContextMenu");
    globals.locateMenu(menu, e.clientX, e.clientY);
});

document.getElementById("trend_chart").addEventListener("click", (e) => {
    globals.hideById("chartContextMenu");
});

document.getElementById("btnZoomPrev").addEventListener("click", (e)=>{
    trend_ZoomPrev();
    globals.hideById("chartContextMenu");
});
//#endregion CHART CONTEXT MENU

//#region CHART CURSOR
Chart.defaults.LineWithLine = Chart.defaults.line;
Chart.controllers.LineWithLine = Chart.controllers.line.extend({
    draw: function(ease) {
        Chart.controllers.line.prototype.draw.call(this, ease);
        
        if (this.chart.tooltip._active && this.chart.tooltip._active.length) {
            var activePoint = this.chart.tooltip._active[0],
                ctx = this.chart.ctx,
                x = activePoint.tooltipPosition().x,
                topY = this.chart.legend.bottom,
                bottomY = this.chart.chartArea.bottom;
            console.log(`Sample index = ${activePoint._index}`);
            console.log(activePoint);
            // Handle date time rendering.
            let dateTime = activePoint._chart.data.labels[activePoint._index].join(" ");
            let textWidth = 122;
            let textHeight = 13;
            let textPosYOffset = 3;
            let textPosRightXOffset = 3;
            let textPosLeftXOffset = 0 - textWidth - 3;
            let textPosXOffset = activePoint._index < 1000 ? textPosRightXOffset : textPosLeftXOffset;
            let textBoxLeft = x + textPosXOffset - 3;
            let textBoxRight = textWidth + 3;
            let textBoxTop = (bottomY - textPosYOffset) - textHeight;
            let textBoxBottom = textHeight + 3;
            // draw line
            ctx.save();
            ctx.beginPath();
            if (trendDragData.displayDiffTime){
                if (trendDragData.dragging){
                    ctx.moveTo(x, topY);
                    ctx.lineTo(x, bottomY);
                }
                else{
                    ctx.moveTo(trendDragData.end_x, topY);
                    ctx.lineTo(trendDragData.end_x, bottomY);
                    textBoxLeft = trendDragData.end_x + textPosXOffset - 3;
                }
            }
            else{
                ctx.moveTo(x, topY);
                ctx.lineTo(x, bottomY);
            }
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#fff';
            ctx.stroke();
            ctx.fillStyle = "rgba(90,90,90,0.7)"; // #5a5a5a
            if (trendDragData.displayDiffTime){
                ctx.beginPath();
                ctx.moveTo(trendDragData.start_x, topY);
                ctx.lineTo(trendDragData.start_x, bottomY);
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#fff';
                ctx.stroke();
                ctx.fillStyle = "rgba(255,255,255,0.1)";
                if (trendDragData.dragging){
                    ctx.fillRect(trendDragData.start_x, topY, x-trendDragData.start_x, bottomY);
                }
                else{
                    ctx.fillRect(trendDragData.start_x, topY, trendDragData.end_x-trendDragData.start_x, bottomY);
                }
                ctx.fillStyle = trendDragData.dragForward ? "rgba(29,112,58,0.7)" : "rgba(128,27,22,0.7)";
            }
            ctx.fillRect(textBoxLeft, textBoxTop, textBoxRight, textBoxBottom);
            ctx.font = "13px Helvetica";
            ctx.fillStyle = '#fff';
            if (!trendDragData.displayDiffTime){
                    ctx.fillText(dateTime, x + textPosXOffset, bottomY - textPosYOffset);
            }
            else{
                if (trendDragData.dragging){
                    ctx.fillText(trendDragData.diffTime, x + textPosXOffset, bottomY - textPosYOffset);
                }
                else {
                    if (trendDragData.start_x != trendDragData.end_x){
                        ctx.fillText(trendDragData.diffTime, trendDragData.end_x + textPosXOffset, bottomY - textPosYOffset);
                        let zoomImage = new Image();
                        zoomImage.src = "./images/Zoom.png";
                        let offset_x = trendDragData.start_x < trendDragData.end_x? trendDragData.start_x : trendDragData.end_x;
                        ctx.drawImage(zoomImage, Math.abs(trendDragData.start_x - trendDragData.end_x)/2 + offset_x - 25, (bottomY - topY)/2 + topY, 50, 45);
                    }
                }
            }
            ctx.restore();
            // Update the pen values:
            app_Trend.showPenCursorValues(activePoint._index);
        }
        else {
            app_Trend.hidePenCursorValues();
        }
    }
});

Chart.Tooltip.positioners.custom = function(elements, eventPosition) {
    /** @type {Chart.Tooltip} */
    var tooltip = this;

    let yPos = tooltip._active[0].tooltipPosition().y;
    console.log(eventPosition);
    console.log(elements[0]._index);

    return {
        x: tooltip._active[0].tooltipPosition().x,
        y: 0
    };
};


trend_chart.onpointerdown = chart_onPointerDownHandler;
trend_chart.onpointerup = chart_onPointerUpHandler;
trend_chart.onpointermove = null;

var trendDragData = {
    startTime: "",
    endTime: "",
    diffTime: "",
    displayDiffTime: false,
    dragForward: true,
    dragging: false,
    start_x: 0,
    end_x: 0,
};

function trend_Zoom(e) {
    console.log("Clicked on chart.");
    // If an area has been selected zoom in.
    if (trendDragData.displayDiffTime && !trendDragData.dragging){
        // Record the current chart time range.
        app_Trend.zoomprev_StartTime = app_Trend.trend.startTime;
        app_Trend.zoomprev_EndTime = app_Trend.trend.endTime;

        // Calculate and update to the selected time range.
        if (trendDragData.dragForward){
            app_Trend.trend.startTime = trendDragData.startTime;
            app_Trend.trend.endTime = trendDragData.endTime;
        }
        else{
            app_Trend.trend.startTime = trendDragData.endTime;
            app_Trend.trend.endTime = trendDragData.startTime;
        }

        trendDragData.displayDiffTime = false;
        trendDragData.start_x = 0;
        trendDragData.end_x = 0;
        trend_chart.onpointermove = null;
        // Redraw the chart.
        app_Trend.UpdateChart();
    }
};

function chart_onPointerDownHandler(e) {
    // check for data point near event location
    var activePoint = app_Trend.chart.tooltip._active[0];
    if (activePoint){
        let x = activePoint.tooltipPosition().x;
        if ((x > trendDragData.start_x && x < trendDragData.end_x) || (x > trendDragData.end_x && x < trendDragData.start_x)){
            trend_Zoom(e);
            return;
        }
        trendDragData.start_x = activePoint.tooltipPosition().x;
        trendDragData.end_x = activePoint.tooltipPosition().x;
        trendDragData.startTime = activePoint._chart.data.labels[activePoint._index].join(" ");
        console.log(`Start time = ${trendDragData.startTime}`);
        trendDragData.displayDiffTime = true;
        trend_chart.onpointermove = move_handler;
        trendDragData.dragging = true;
    }
};

function chart_onPointerUpHandler(e) {
    // check for data point near event location
    var activePoint = app_Trend.chart.tooltip._active[0];
    if (activePoint){
        var x = activePoint.tooltipPosition().x;
        console.log(`Drag stop chart @ ${x}`);
        trendDragData.endTime = activePoint._chart.data.labels[activePoint._index].join(" ");
        console.log(`End time = ${trendDragData.endTime}`);
        //trend_chart.onpointermove = null;
        //trendDragData.displayDiffTime = false;
        if (trendDragData.dragging){
            trendDragData.end_x = x;
            trendDragData.dragging = false;
        }
    }
};

function move_handler(e) {
    var activePoint = app_Trend.chart.tooltip._active[0];
    if (activePoint){
        var ctx = app_Trend.chart.ctx;
        var x = activePoint.tooltipPosition().x;
        // Determine if the mouse was moved out of the selected region.
        if (!trendDragData.dragging){
            if ((x < trendDragData.start_x && x < trendDragData.end_x) || (x > trendDragData.start_x && x > trendDragData.end_x)){
                trendDragData.displayDiffTime = false;
                trendDragData.start_x = 0;
                trendDragData.end_x = 0;
                trend_chart.onpointermove = null;
            }
        }
        else{
            console.log(`Dragging end time chart @ ${x}`);
            trendDragData.endTime = activePoint._chart.data.labels[activePoint._index].join(" ");

            let mStart = moment(trendDragData.startTime);
            let mEnd = moment(trendDragData.endTime);
            trendDragData.dragForward = (mStart < mEnd); 
            let diffSecs = trendDragData.dragForward ? mEnd.diff(mStart, "seconds") 
                : mStart.diff(mEnd, "seconds");
                trendDragData.diffTime = trendDragData.dragForward ? globals.getDHMSFromSecs(diffSecs) 
                : "- " + globals.getDHMSFromSecs(diffSecs);
            console.log(`Difference in seconds = ${diffSecs}`);
        }
    }
};

//#region CHART CONTEXT MENU
function trend_ZoomPrev() {
    app_Trend.trend.startTime = app_Trend.zoomprev_StartTime;
    app_Trend.trend.endTime = app_Trend.zoomprev_EndTime;
    // Redraw the chart.
    app_Trend.UpdateChart();
};

document.getElementById("trend_chart").addEventListener("contextmenu", (e) => {
    console.log(e.clientX);
    var menu = document.getElementById("chartContextMenu");
    globals.locateMenu(menu, e.clientX, e.clientY);
});

document.getElementById("trend_chart").addEventListener("click", (e) => {
    globals.hideById("chartContextMenu");
});

document.getElementById("btnZoomPrev").addEventListener("click", (e)=>{
    trend_ZoomPrev();
    globals.hideById("chartContextMenu");
});

//#endregion CHART CONTEXT MENU

//#endregion CHART CURSOR
