const { app, BrowserWindow, ipcMain, screen } = require("electron");
app.commandLine.appendSwitch("no-sandbox");
const remoteMain = require("@electron/remote/main");
remoteMain.initialize();
const fs = require("fs");
const path = require("path");

const DEFAULT_WIDTH = 1000;
const DEFAULT_HEIGHT = 800;

function getSettingsPath() {
  return path.join(app.getPath("userData"), ".settings");
}

function loadWindowBounds() {
  try {
    const data = fs.readFileSync(getSettingsPath(), "utf8");
    const settings = JSON.parse(data);
    const b = settings.mainWindowBounds;
    if (!b) return null;
    if (typeof b.width !== "number" || typeof b.height !== "number") return null;
    if (b.width < 200 || b.height < 150) return null;
    return {
      x: typeof b.x === "number" ? b.x : undefined,
      y: typeof b.y === "number" ? b.y : undefined,
      width: b.width,
      height: b.height,
      isMaximized: !!b.isMaximized
    };
  } catch (err) {
    return null;
  }
}

function boundsAreOnScreen(bounds) {
  if (bounds.x === undefined || bounds.y === undefined) return false;
  const displays = screen.getAllDisplays();
  const minOverlap = 100;
  for (const display of displays) {
    const db = display.bounds;
    const overlapX = Math.max(0, Math.min(bounds.x + bounds.width, db.x + db.width) - Math.max(bounds.x, db.x));
    const overlapY = Math.max(0, Math.min(bounds.y + bounds.height, db.y + db.height) - Math.max(bounds.y, db.y));
    if (overlapX >= minOverlap && overlapY >= minOverlap) return true;
  }
  return false;
}

function saveWindowBounds(bounds) {
  const settingsPath = getSettingsPath();
  let settings = {};
  try {
    const data = fs.readFileSync(settingsPath, "utf8");
    settings = JSON.parse(data);
  } catch (err) {
    // File missing or corrupt — start fresh
  }
  settings.mainWindowBounds = bounds;
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings), "utf8");
  } catch (err) {
    console.error("Failed to save main window bounds:", err);
  }
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow() {
  const saved = loadWindowBounds();
  let winOptions = {
    width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT, show: false, backgroundColor: "#fff",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  };
  let savedMaximized = false;
  if (saved) {
    winOptions.width = saved.width;
    winOptions.height = saved.height;
    if (boundsAreOnScreen(saved)) {
      winOptions.x = saved.x;
      winOptions.y = saved.y;
    }
    savedMaximized = saved.isMaximized;
  }

  // Create the browser window.
  win = new BrowserWindow(winOptions);

  remoteMain.enable(win.webContents);

  // and load the index.html of the app.
  win.loadFile("index.html");

  // Remove Window Menu
  //win.setMenu(null);
  //win.autoHideMenuBar = true;
  win.setMenuBarVisibility(false);
  //win.removeMenu();

  // Open the DevTools.
  //win.webContents.openDevTools();

  let isMaximized = savedMaximized;
  if (savedMaximized) win.maximize();
  let unmaximizeTimer = null;

  win.on("maximize", () => {
    if (unmaximizeTimer) { clearTimeout(unmaximizeTimer); unmaximizeTimer = null; }
    isMaximized = true;
  });
  win.on("unmaximize", () => {
    if (unmaximizeTimer) clearTimeout(unmaximizeTimer);
    unmaximizeTimer = setTimeout(() => {
      isMaximized = false;
      unmaximizeTimer = null;
    }, 200);
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on("close", () => {
    if (unmaximizeTimer) { clearTimeout(unmaximizeTimer); unmaximizeTimer = null; }
    const normalBounds = win.getNormalBounds();
    saveWindowBounds({
      x: normalBounds.x,
      y: normalBounds.y,
      width: normalBounds.width,
      height: normalBounds.height,
      isMaximized: isMaximized
    });
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

// Enable @electron/remote for all child windows (modals, popups).
app.on("browser-window-created", (event, win) => {
  remoteMain.enable(win.webContents);
});

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
