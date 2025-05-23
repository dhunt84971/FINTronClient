const { app, BrowserWindow, ipcMain } = require("electron");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({ 
    width: 1000, height: 800, show:false, backgroundColor: "#fff",
    webPreferences: {
    nodeIntegration: true,
    webviewTag: true 
    }    
  });

  // and load the index.html of the app.
  win.loadFile("index.html");

  // Remove Window Menu
  //win.setMenu(null);
  //win.autoHideMenuBar = true;
  win.setMenuBarVisibility(false);
  //win.removeMenu();
  
  // Open the DevTools.
  //win.webContents.openDevTools();

  win.once('ready-to-show', () => {
    win.show();
  });
  // Emitted when the window is closed.
  win.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });
}

//#region IPC EVENTS
ipcMain.on("pen", (event, message) => { 
  win.webContents.send("pen", message);
});

ipcMain.on("timedata", (event, message) => { 
  win.webContents.send("timedata", message);
});

ipcMain.on("penProps", (event, message) => { 
  win.webContents.send("penProps", message);
});

ipcMain.on("removePen", (event, message) => { 
  win.webContents.send("removePen", message);
});

ipcMain.on("exportdata", (event, message) => { 
  win.webContents.send("exportdata", message);
});

ipcMain.on("printTrend", (event, message) => { 
  win.webContents.send("printTrend", message);
});
//#endregion IPC EVENTS

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
