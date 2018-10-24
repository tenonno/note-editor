// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu, ipcMain, dialog } = require("electron");

const path = require("path");

const isDevelopment = process.env.NODE_ENV === "development";

const dirname = isDevelopment ? __dirname : path.resolve(__dirname, "../../");

const audioAssetPath = path.resolve(dirname, "assets/audio");
const musicGameSystemsPath = path.resolve(dirname, "assets/musicGameSystems");

let mainWindow;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600
  });

  mainWindow.setTitle("ChartEditor");

  if (isDevelopment) {
    mainWindow.loadURL(
      `http://localhost:9000?aap=${audioAssetPath}&mgsp=${musicGameSystemsPath}`
    );
  } else {
    mainWindow.loadURL(
      `file:///resources/app.asar/dist/index.html?aap=${audioAssetPath}&mgsp=${musicGameSystemsPath}`
    );
  }

  initWindowMenu();

  if (isDevelopment) {
    const loadDevtool = require("electron-load-devtool");
    loadDevtool({
      id: "pfgnfdagidkfgccljigdamigbcnndkod",
      name: "MobX Developer Tools"
    });
  }

  mainWindow.webContents.openDevTools();

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on("closed", function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

app.setName("NoteEditor");

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function() {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

function send(name, value) {
  let resolve = null;

  ipcMain.once(name, (_, response) => {
    resolve(response);
  });

  const ret = mainWindow.webContents.send(name, value);

  return new Promise(_resolve => (resolve = _resolve));
}

function initWindowMenu() {
  const template = [
    {
      label: "",
      submenu: [
        {
          label: "test",
          click() {}
        }
      ]
    },
    {
      label: "ファイル",
      submenu: [
        {
          label: "開く",
          accelerator: "CmdOrCtrl+O",
          click() {
            mainWindow.webContents.send("open");
          }
        },
        {
          type: "separator"
        },
        {
          label: "保存",
          accelerator: "CmdOrCtrl+S",
          click() {
            mainWindow.webContents.send("save");
          }
        },
        {
          label: "名前を付けて保存",
          accelerator: "CmdOrCtrl+Shift+S",
          click() {
            mainWindow.webContents.send("saveAs");
          }
        },
        {
          type: "separator"
        },
        {
          label: "BMS 譜面をインポート",
          click() {
            mainWindow.webContents.send("importBMS");
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);

  Menu.setApplicationMenu(menu);
}
