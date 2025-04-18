const { globalShortcut } = require("electron");

//#region GLOBAL VARIABLES
var printTrend = {};

var printchartConfig = {};
var printCanvas = document.querySelector('#chart');
var printchartDoc = printCanvas.getContext("2d");
var printChart;

var printRSchartConfig = {};
var printRSCanvas = document.querySelector('#chartRS');
var printRSchartDoc = printRSCanvas.getContext("2d");
var printRSChart = new Chart(printRSchartDoc, printRSchartConfig);
var penData;

const numSamples = 2000;
var selectedPen;

var config = {
    user: "",
    password: "",
    server: "",
    database: "",
    requestTimeout: 120000
}

var multiYAxis = true;

//#endregion GLOBAL VARIABLES

//#region PRINT FUNCTIONS
function printCharttoPDF(){
    var printCanvasImg = printCanvas.toDataURL("image/jpeg", 1.0);
    
        //creates PDF from img
    var doc = new jsPDF('landscape');
    doc.setFontSize(10);
    doc.text(15, 8, printTrend.name);
    doc.addImage(printCanvasImg, 'JPEG', 10, 20, 280, 190 );
    let filename = printTrend.fileName.replace(".trd",".pdf");
    if (!filename.includes(".pdf")){
        filename += ".pdf";
    }
    console.log(filename);
    doc.save(filename);
    globals.showOKMessageBox("The PDF file was saved in the same folder as the trend file.");
}
//#endregion PRINT FUNCTIONS

//#region PEN FUNCTIONS
function AutoRangeDigitals () {
    let pens = printTrend.pens.filter(x=>x.type == 1 && x.rangeAuto);
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
}

//#endregion PEN FUNCTIONS

//#region CHART DISPLAY FUNCTIONS
function ChartResize(callback) {
    console.log("Resizing chart.")
       
    if (printChart) {
        printChart.destroy();
    }
    printCanvas.parentNode.style.width="0";
    printCanvas.parentNode.style.height="0";
    printCanvas.width="1600";
    printCanvas.height="1000";

    printchartDoc = printCanvas.getContext("2d");

    printChart = new Chart(printchartDoc, printchartConfig);
    printChart.canvas.parentNode.style.width = '1500px';

    printRSChart.destroy();
    document.getElementById("chart").height = "50px";
    printRSChart = new Chart(printRSchartDoc, printRSchartConfig);
    printRSChart.resize();

    if (callback) {
        callback();
    }
}

function GetPenArray() {
    var penArray = [];
    printTrend.pens.forEach(pen => {
        if (pen.name != "Default") {
            penArray.push(pen.name);
        }
    });
    return penArray
}

function GetInterval() {
    var endTime = moment(printTrend.endTime, dateTimeFormat).toDate();
    var startTime = moment(printTrend.startTime, dateTimeFormat).toDate();
    var diff_secs = (moment(printTrend.endTime, dateTimeFormat).diff(moment(printTrend.startTime, dateTimeFormat))) / 1000;
    return diff_secs / numSamples;
}

function setChartConfiguration(){
    var labels = [];
    penData.recordset.forEach(record => {
        var multiLineLbl = record.time.split(" ");
        labels.push(multiLineLbl);
    });
    var datasets = [];
    var yAxes = [];
    var x = 0;
    printTrend.pens.forEach(pen => {
        if ((pen.name != "Default") && (pen.name != "")) {
            console.log("getting data for '" + pen.name + "'");
            var data = [];
            penData.recordset.forEach(record => {
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
            AutoRangeDigitals();
            if (pen.rangeAuto && pen.type != 1) {
                ticks = {
                    fontColor: "black"
                    //stepSize: stepSize
                }
            } else {
                ticks = {
                    fontColor: "black",
                    min: pen.min,
                    max: pen.max
                    //stepSize: stepSize
                }
            }
            var yAxis = {
                id: pen.name,
                type: (pen.yAxisType)? pen.yAxisType : "linear",
                weight: (pen.name == selectedPen)? 0 : 1,
                //display: (pen.name == selectedPen),
                //display: true,
                display: multiYAxis ? true : (pen.name == selectedPen),
                scaleLabel: {
                    fontColor: "black",
                    fontSize: 14,
                    display: true,
                    labelString: pen.description
                },
                gridLines: {
                    color: "#999999",
                    //display: (pen.name == selectedPen),
                    drawOnChartArea: (pen.name == selectedPen),
                    drawTicks: multiYAxis ? true : (pen.name == selectedPen)
                },
                ticks: ticks,
                afterDataLimits: (axis) => {
                    var pen = printTrend.pens.find(x => x.name === axis.id);
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

    printchartConfig = {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        responsive: false,
        options: {
            legend: {
                display: true
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
                        fontColor: "black",
                        maxTicksLimit: 7.1,
                        maxRotation: 0
                    }
                }],
                yAxes: yAxes
            },
            tooltips: {
                mode: "index",
                intersect: false,
                position: "nearest"
            },
            hover: {
                mode: "index",
                intersect: true
            }
        }
    };

    printRSchartConfig = {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        responsive: true,
        options: {
            legend: {
                display: true
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
                        fontColor: "black",
                        maxTicksLimit: 7.1,
                        maxRotation: 0
                    }
                }],
                yAxes: yAxes
            },
            tooltips: {
                mode: "index",
                intersect: false,
                position: "nearest"
            },
            hover: {
                mode: "index",
                intersect: true
            }
        }
    };
}

async function UpdateChart(callback) {
    console.log("Calling get data");
    var penArray = GetPenArray();
    if (penArray.length > 0) {
        loadDBConfig((err, config)=>{
            db = new appDatabase(config);
            db.connect().catch((err)=>{console.log(err);});  // Preload the connection to speed it up.
            db.getHistory(penArray, printTrend.startTime, printTrend.endTime, GetInterval(), (err, result) => {
                if (err) {
                    ShowWarningMessageBox("Failed to get data.");
                    return;
                }
                penData = result;
                setChartConfiguration();
                ChartResize(() => {
                    if (callback) {
                        console.log("Executing UpdateChart callback.");
                        callback();
                    }
                });
            });
        });
    }
};
//#endregion CHART DISPLAY FUNCTIONS

//#region EVENT HANDLERS
electron.ipcRenderer.on('printTrend', (event, message) => {
    if (message){
        console.log(message);

        printTrend = message.trend;
        console.log(printTrend);

        selectedPen = message.selectedPen;
        console.log(selectedPen);

        Chart.plugins.register({
            beforeDraw: function(chartInstance) {
                var ctx = chartInstance.chart.ctx;
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, chartInstance.chart.width, chartInstance.chart.height);
            }
            });
        UpdateChart();   
    }
});

window.addEventListener("resize", () => {
    ChartResize();
});

document.getElementById("btnPrint").addEventListener("click", ()=>{
    printCharttoPDF();
});

document.getElementById("btnYAxis").addEventListener("click", ()=>{
    multiYAxis = !multiYAxis;
    setChartConfiguration();
    ChartResize();
});

//#endregion EVENT HANDLERS