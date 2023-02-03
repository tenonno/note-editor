import { app, BrowserWindow, ipcMain, Menu } from "electron";
import * as fs from "fs";
import * as path from "path";

const isDevelopment = process.env.NODE_ENV === "development";

let dirname = isDevelopment ? __dirname : path.resolve(__dirname, "../../");

if (dirname.includes(".app")) {
  dirname = path.resolve(dirname, "../../");
}

const assetsPath = path.resolve(dirname, "assets");
const audioAssetPath = path.resolve(dirname, "assets/audio");
const musicGameSystemsPath = path.resolve(dirname, "assets/musicGameSystems");
const keyConfigPath = path.resolve(dirname, "assets/keyconfig.json");

let mainWindow: BrowserWindow | null;

const defaultKeyConfig = {
  editModes: ["Q", "W", "E", "R"],
  notes: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
};

const keyConfigText = fs.existsSync(keyConfigPath)
  ? fs.readFileSync(keyConfigPath)
  : "";

const userKeyConfig = JSON.parse(keyConfigText.toString() || "{}");

const keyConfig = Object.assign(defaultKeyConfig, userKeyConfig);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
    },
  });

  if (isDevelopment) {
    mainWindow!.loadURL(`http://localhost:9000`);
  } else {
    if (process.platform === "darwin") {
      // win
      mainWindow!.loadFile(`dist/index.html`);
    } else {
      // mac
      mainWindow!.loadURL(`file:///resources/app.asar/dist/index.html`);
    }
  }

  // ページが読み込まれたら assets フォルダのパスを渡す
  mainWindow!.webContents.on("did-finish-load", () => {
    mainWindow!.webContents.send("assets", {
      assetsPath,
      aap: audioAssetPath,
      mgsp: musicGameSystemsPath,
    });
  });

  initWindowMenu();

  /*
  if (isDevelopment) {
    const loadDevtool = require("electron-load-devtool");
    loadDevtool({
      id: "pfgnfdagidkfgccljigdamigbcnndkod",
      name: "MobX Developer Tools"
    });
  }
  */

  mainWindow!.webContents.openDevTools();

  mainWindow!.on("close", (e) => {
    mainWindow!.webContents.send("close");
  });
  mainWindow!.on("closed", () => (mainWindow = null));
}

app.setName("NoteEditor");

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (!mainWindow) {
    createWindow();
  }
});

function initWindowMenu() {
  ipcMain.on("showNoteLineContextMenu", (event, curveType, curveTypes: string[], innerNoteTypes: string[]) => {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: "curve",
        submenu: curveTypes.map(value => (
          {
            label: value,
            type: "checkbox",
            checked: curveType === value,
            click() {
              mainWindow!.webContents.send("setCurveType", value);
            },
          }
        )),
      },
      { type: "separator" },
      {
        label: "addInnerNote",
        submenu: innerNoteTypes.map(value => (
          {
            label: value,
            click() {
              mainWindow!.webContents.send("addInnerNote", value);
            },
          }
        )),
      },
      { type: "separator" },
      {
        label: "delete",
        click() {
          mainWindow!.webContents.send("deleteNoteLine");
        },
      },
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup();
  });

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "ファイル",
      submenu: [
        {
          label: "開く",
          accelerator: "CmdOrCtrl+O",
          click() {
            mainWindow!.webContents.send("open");
          },
        },
        { type: "separator" },
        {
          label: "保存",
          accelerator: "CmdOrCtrl+S",
          click() {
            mainWindow!.webContents.send("save");
          },
        },
        {
          label: "名前を付けて保存",
          accelerator: "CmdOrCtrl+Shift+S",
          click() {
            mainWindow!.webContents.send("saveAs");
          },
        },
        { type: "separator" },
        {
          label: "BMS 譜面をインポート",
          click() {
            mainWindow!.webContents.send("importBMS");
          },
        },
      ],
    },
    {
      label: "編集",
      submenu: [
        {
          label: "元に戻す",
          role: "undo",
        },
        {
          label: "やり直す",
          role: "redo",
        },
        { type: "separator" },
        {
          label: "切り取り",
          role: "cut",
        },
        {
          label: "コピー",
          role: "copy",
        },
        {
          label: "貼り付け",
          role: "paste",
        },
        {
          label: "左右反転して貼り付け",
          accelerator: "CmdOrCtrl+Shift+V",
          click() {
            mainWindow!.webContents.send("pasteFlipLane");
          },
        },
        {
          label: "削除",
          role: "delete",
        },
        { type: "separator" },
        {
          label: "ノートを上に移動",
          accelerator: "Up",
          click() {
            mainWindow!.webContents.send("moveDivision", 1);
          },
        },
        {
          label: "ノートを下に移動",
          accelerator: "Down",
          click() {
            mainWindow!.webContents.send("moveDivision", -1);
          },
        },
        {
          label: "ノートを左に移動",
          accelerator: "Left",
          click() {
            mainWindow!.webContents.send("moveLane", -1);
          },
        },
        {
          label: "ノートを右に移動",
          accelerator: "Right",
          click() {
            mainWindow!.webContents.send("moveLane", 1);
          },
        },
        {
          label: "ノートの位置を左右反転",
          accelerator: "CmdOrCtrl+F",
          click() {
            mainWindow!.webContents.send("flipLane");
          },
        },
        {
          label: "ノートの位置を上下反転",
          accelerator: "CmdOrCtrl+D",
          click() {
            mainWindow!.webContents.send("flipVertical");
          },
        },
      ],
    },
    {
      label: "選択",
      submenu: [
        {
          label: "小節分割数",
          submenu: [
            {
              label: "アップ",
              accelerator: "CmdOrCtrl+Up",
              click() {
                mainWindow!.webContents.send("changeMeasureDivision", 1);
              },
            },
            {
              label: "ダウン",
              accelerator: "CmdOrCtrl+Down",
              click() {
                mainWindow!.webContents.send("changeMeasureDivision", -1);
              },
            },
          ],
        },
        {
          label: "ノートサイズ",
          submenu: [
            {
              label: "アップ",
              accelerator: "CmdOrCtrl+Right",
              click() {
                mainWindow!.webContents.send("changeObjectSize", 1);
              },
            },
            {
              label: "ダウン",
              accelerator: "CmdOrCtrl+Left",
              click() {
                mainWindow!.webContents.send("changeObjectSize", -1);
              },
            },
          ],
        },
        {
          label: "編集モード",
          submenu: [
            {
              label: "選択モード",
              accelerator: keyConfig.editModes[0],
              click() {
                mainWindow!.webContents.send("changeEditMode", 1);
              },
            },
            {
              label: "追加モード",
              accelerator: keyConfig.editModes[1],
              click() {
                mainWindow!.webContents.send("changeEditMode", 2);
              },
            },
            {
              label: "削除モード",
              accelerator: keyConfig.editModes[2],
              click() {
                mainWindow!.webContents.send("changeEditMode", 3);
              },
            },
            {
              label: "接続モード",
              accelerator: keyConfig.editModes[3],
              click() {
                mainWindow!.webContents.send("changeEditMode", 4);
              },
            },
          ],
        },
        {
          label: "ノートタイプ",
          submenu: [
            ...[...Array(9)].fill(0).map((_, index) => ({
              label: `${index + 1}番目を選択`,
              accelerator: keyConfig.notes[index],
              click() {
                mainWindow!.webContents.send("changeNoteTypeIndex", index);
              },
            })),
          ],
        },
      ],
    },
    {
      label: "制御",
      submenu: [
        {
          label: "再生/一時停止",
          accelerator: "Space",
          click() {
            mainWindow!.webContents.send("toggleMusicPlaying");
          },
        },
      ],
    },
    {
      label: "開発機能",
      submenu: [
        {
          label: "リロード",
          accelerator: "CmdOrCtrl+R",
          click() {
            mainWindow!.webContents.send("reload");
          },
        },
        {
          label: "Toggle Developer Tools",
          accelerator: "F12",
          click: () => {
            mainWindow?.webContents.toggleDevTools();
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);

  Menu.setApplicationMenu(menu);
}
