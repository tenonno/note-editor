import { ipcRenderer, remote } from "electron";
import * as fs from "fs";
import http from "http";
import * as _ from "lodash";
import { min } from "lodash";
import { action, flow, observable, runInAction } from "mobx";
import * as Mousetrap from "mousetrap";
import {
  OptionsObject,
  SnackbarKey,
  SnackbarMessage,
  VariantType,
} from "notistack";
import box from "../utils/mobx-box";
import * as util from "util";
import { Fraction } from "../math";
import { MeasureRecord } from "../objects/Measure";
import { Note, NoteRecord } from "../objects/Note";
import { OtherObject, OtherObjectRecord } from "../objects/OtherObject";
import { TimelineData } from "../objects/Timeline";
import BMSImporter from "../plugins/BMSImporter";
import extensionUtility from "../utils/ExtensionUtility";
import { GUID, guid } from "../utils/guid";
import AssetStore from "./Asset";
import Chart from "./Chart";
import EditorSetting, { EditMode } from "./EditorSetting";
import MusicGameSystem from "./MusicGameSystem";
import TimelineObject from "../objects/TimelineObject";
import { NoteLineContextMenu } from "./contextMenu";

const { dialog } = remote;

export type Notification = {
  guid: GUID;
  text: string;
  date: Date;
  type: VariantType;
};

export default class Editor {
  /**
   * エディタの起動時間
   */
  currentFrame = 0;

  @observable.ref
  inspectorTargets: TimelineObject[] = [];

  private copiedNotes: Note[] = [];
  private copiedOtherObjects: OtherObject[] = [];

  @observable.shallow
  public notifications: Notification[] = [];

  /**
   * 通知
   * @param text 通知内容
   * @param type
   */
  @action
  public notify(text: string, type: VariantType = "info") {
    this.notifications.push({ guid: guid(), text, date: new Date(), type });
    this.enqueueSnackbar?.(text, {
      variant: type,
      anchorOrigin: {
        vertical: "bottom",
        horizontal: "right",
      },
    });
  }

  @action
  setInspectorTarget(target: any) {
    for (const target of this.inspectorTargets) {
      target.isSelected = false;
    }
    this.inspectorTargets = [target];
    target.isSelected = true;
  }

  @action
  public addInspectorTarget(target: TimelineObject) {
    this.inspectorTargets = _.uniq([...this.inspectorTargets, target]);
    target.isSelected = true;
  }

  @action
  public removeInspectorTarget(target: TimelineObject) {
    this.inspectorTargets = this.inspectorTargets.filter((x) => x !== target);
    target.isSelected = false;
  }

  /**
   * 検証するオブジェクトを初期化する
   */
  @action
  public clearInspectorTarget() {
    for (const target of this.inspectorTargets) {
      target.isSelected = false;
    }
    this.inspectorTargets = [];
  }

  private getInspectNotes(): Note[] {
    const notes = [];
    for (const target of this.inspectorTargets) {
      if (target instanceof NoteRecord) {
        notes.push(target);
      }
      if (target instanceof MeasureRecord) {
        notes.push(
          ...this.currentChart!.timeline.notes.filter(
            (n) => n.measureIndex == target.index
          )
        );
      }
    }
    return notes;
  }

  private getInspectedOtherObjects(): OtherObject[] {
    const otherObjects = [];
    for (const target of this.inspectorTargets) {
      if (target instanceof OtherObjectRecord) {
        otherObjects.push(target as OtherObject);
      }
      if (target instanceof MeasureRecord) {
        otherObjects.push(
          ...this.currentChart!.timeline.otherObjects.filter(
            (n) => n.measureIndex == target.index
          )
        );
      }
    }
    return otherObjects;
  }

  @observable.ref
  currentChart: Chart | null = null;

  @observable
  currentChartIndex: number = 0;

  @observable
  setting = new EditorSetting();

  @observable
  asset = new AssetStore(() =>
    this.openCharts(JSON.parse(localStorage.getItem("filePaths") || "[]"))
  );

  @observable
  charts: Chart[] = [];

  @action
  setAudioDirectory(path: string) {}

  /**
   * 新規譜面を作成する
   */
  @action
  public newChart(
    musicGameSystem: MusicGameSystem,
    audioSource: string,
    data?: TimelineData
  ) {
    const newChart = new Chart(musicGameSystem, audioSource);
    this.charts.push(newChart);
    return newChart;
  }

  /**
   * 譜面を削除する
   */
  @action
  removeChart(chartIndex: number) {
    this.saveConfirm(chartIndex);
    this.charts = this.charts.filter((_, index) => index !== chartIndex);
    this.setCurrentChart(0);
  }

  /**
   * 譜面を切り替える
   * @param chartIndex 切り替える譜面のインデックス
   */
  @action
  public setCurrentChart(chartIndex: number) {
    this.currentChart?.pause();

    this.currentChartIndex = chartIndex;

    if (!this.charts.length) {
      this.currentChart = null;
      return;
    }

    this.currentChart = this.charts[chartIndex];

    // 譜面を切り替えたときは選択ツールに切り替える
    this.setting.setEditMode(EditMode.Select);

    this.setting.editNoteTypeIndex = Math.min(
      this.setting.editNoteTypeIndex,
      this.currentChart.musicGameSystem.noteTypes.length - 1
    );
    this.setting.editLaneTypeIndex = Math.min(
      this.setting.editLaneTypeIndex,
      this.currentChart.musicGameSystem.laneTemplates.length - 1
    );
    this.setting.editOtherTypeIndex = Math.min(
      this.setting.editOtherTypeIndex,
      this.currentChart.musicGameSystem.otherObjectTypes.length - 1
    );
  }

  public static instance: Editor | null = null;

  /**
   * 譜面を開いてるかチェックする
   * 開いてなかったら warning 出す
   * @returns 譜面を開いているか
   */
  private existsCurrentChart(): boolean {
    const exists = this.currentChart !== null;
    if (!exists) console.warn("譜面を開いていません");
    return exists;
  }

  /**
   * ノーツの重複をチェックする
   * @private
   */
  @action
  public checkNoteOverlap() {
    const chart = this.currentChart;

    if (!chart) {
      return;
    }

    if (chart.musicGameSystem.checkNoteOverlap) {
      const overlapWarningMessages = this.getNoteOverlapWarningMessages();
      chart.overlapWarningMessages = overlapWarningMessages;

      if (overlapWarningMessages.length > 0) {
        this.notify(`${overlapWarningMessages.length} 件の警告`, "warning");
      }
    }
  }

  private getNoteOverlapWarningMessages(): string[] {
    const warningMessageSet = new Set<string>();

    const chart = this.currentChart;
    if (!chart || !chart.timeline) return [];

    const { noteTypeMap } = chart.musicGameSystem;

    const lanePositionMapSet = new Map<string, Set<string>>(
      chart.timeline.lanes.map((lane) => [lane.guid, new Set<string>()])
    );

    for (const note of chart.timeline.notes) {
      const noteType = noteTypeMap.get(note.type);
      if (!noteType) continue;
      if (noteType.ignoreOverlap) continue;

      const lanePositionMap = lanePositionMapSet.get(note.lane);

      if (!lanePositionMap) continue;

      const reducedMeasurePosition = Fraction.reduce(note.measurePosition);

      for (let index = 0; index < note.horizontalSize; index++) {
        const laneIndex = note.horizontalPosition.numerator + index;

        const key = `${note.measureIndex}:${reducedMeasurePosition.numerator}:${reducedMeasurePosition.denominator}:${laneIndex}`;

        if (lanePositionMap.has(key)) {
          warningMessageSet.add(
            `ノーツが重複しています\n${note.type} - ${note.measureIndex} - ${reducedMeasurePosition.numerator}/${reducedMeasurePosition.denominator}`
          );
          continue;
        }

        lanePositionMap.add(key);
      }
    }

    return [...warningMessageSet.values()];
  }

  /**
   * 譜面を保存する
   */
  @action
  private save() {
    if (!this.existsCurrentChart()) return;

    const chart = this.currentChart;

    if (!chart) {
      console.warn("譜面を開いていません");
      return;
    }

    if (!chart.filePath) {
      this.saveAs();
      return;
    }

    // 譜面を最適化する
    chart.timeline.optimise();

    this.checkNoteOverlap();

    chart.musicGameSystem.eventListeners.onSerialize?.(chart);

    // 保存
    const data = chart.toJSON();

    fs.writeFile(chart.filePath!, data, "utf8", (err: any) => {
      if (err) {
        return console.log(err);
      }
    });

    this.notify("譜面を保存しました");

    // イベント発火
    const onSave = chart.musicGameSystem.eventListeners.onSave;
    if (onSave) {
      const alert = onSave(chart);
      if (alert) this.notify(alert, "error");
    }
  }

  @action
  private saveAs() {
    if (!this.existsCurrentChart()) return;

    const window = remote.getCurrentWindow();
    const filePath = dialog.showSaveDialogSync(window, {
      title: "タイトル",
      filters: this.dialogFilters,
      properties: ["createDirectory"],
    });

    if (!filePath) return;

    runInAction(() => {
      this.currentChart!.filePath = filePath;
      this.save();
    });
  }

  /**
   * インスペクタの対象を更新する
   */
  @action
  public updateInspector() {
    const targets = this.inspectorTargets;
    this.inspectorTargets = [];

    for (const t of targets) {
      // ノート
      if (t instanceof NoteRecord) {
        const note = this.currentChart!.timeline.noteMap.get(t.guid);
        if (note) this.inspectorTargets.push(note);
      }

      // その他オブジェクト
      else if (t instanceof OtherObjectRecord) {
        const otherObject = this.currentChart!.timeline.otherObjects.find(
          (object) => object.guid === t.guid
        );
        if (otherObject) this.inspectorTargets.push(otherObject);
      }

      // その他
      else {
        this.inspectorTargets.push(t);
      }
    }
  }

  private dialogFilters = [{ name: "譜面データ", extensions: ["json"] }];

  saveConfirm(chartIndex: number) {
    if (
      this.charts[chartIndex].filePath &&
      confirm(this.charts[chartIndex].name + " を保存しますか？")
    ) {
      this.setCurrentChart(chartIndex);
      this.save();
    }
  }

  @action
  private open() {
    const window = remote.getCurrentWindow();
    if (!window) return;
    const paths = dialog.showOpenDialogSync(window, {
      properties: ["openFile", "multiSelections"],
      filters: this.dialogFilters,
    });
    this.openCharts(paths ?? []);
  }

  /**
   * 譜面を開く
   * @param filePaths 譜面のパスのリスト
   */
  private openCharts = flow(function* (this: Editor, filePaths: string[]) {
    for (const filePath of filePaths) {
      const file = yield util.promisify(fs.readFile)(filePath);
      Chart.loadFromJson(file.toString());
      this.currentChart!.filePath = filePath;
    }
  });

  @action
  private copy() {
    if (!this.existsCurrentChart()) return;
    this.copiedNotes = this.getInspectNotes();
    this.copiedOtherObjects = this.getInspectedOtherObjects();

    this.notify(
      `${
        this.copiedNotes.length + this.copiedOtherObjects.length
      } 個のオブジェクトをコピーしました`
    );
  }

  @action
  private pasteNotes() {
    if (this.copiedNotes.length === 0) return;

    const oldChart = this.copiedNotes[0].chart;
    if (oldChart.musicGameSystem !== this.currentChart!.musicGameSystem) {
      this.notify("musicGameSystemが一致しません", "error");
      return;
    }

    const tl = this.currentChart!.timeline;
    if (!this.copiedNotes.every((note) => tl.laneMap.has(note.lane))) {
      this.notify("レーンIDが一致しません", "error");
      return;
    }

    const minMeasureIndex = min(
      this.copiedNotes.map((note) => note.measureIndex)
    ) as number;

    const diff =
      minMeasureIndex -
      Math.min(...this.copiedNotes.map((note) => note.measureIndex));

    const guidMap = new Map<string, string>();
    for (let note of this.copiedNotes) {
      guidMap.set(note.guid, guid());
      note = note.clone();

      // 新旧小節の拍子を考慮して位置を調整
      note.measurePosition = Fraction.mul(
        note.measurePosition,
        Fraction.div(
          oldChart.timeline.measures[note.measureIndex].beat,
          tl.measures[note.measureIndex + diff].beat
        )
      );
      if (note.measurePosition.numerator >= note.measurePosition.denominator)
        continue;

      note.guid = guidMap.get(note.guid)!;
      note.measureIndex += diff;
      note.layer = this.currentChart!.currentLayer.guid;
      note.chart = this.currentChart!;
      tl.addNote(note, false);
    }

    tl.updateNoteMap();

    // ノートラインを複製する
    for (const line of oldChart.timeline.noteLines) {
      if (!guidMap.has(line.head) || !guidMap.has(line.tail)) continue;
      const newLine = _.cloneDeep(line);
      newLine.guid = guid();
      newLine.head = guidMap.get(newLine.head)!;
      newLine.tail = guidMap.get(newLine.tail)!;
      tl.addNoteLine(newLine);
    }
  }

  @action
  private pasteOtherObjects() {
    if (this.copiedOtherObjects.length === 0) return;

    const oldChart = this.copiedOtherObjects[0].chart;
    if (oldChart.musicGameSystem !== this.currentChart!.musicGameSystem) {
      this.notify("musicGameSystemが一致しません", "error");
      return;
    }

    const tl = this.currentChart!.timeline;

    const minMeasureIndex = min(
      this.copiedOtherObjects.map((note) => note.measureIndex)
    ) as number;

    const diff =
      minMeasureIndex -
      Math.min(...this.copiedOtherObjects.map((note) => note.measureIndex));

    const guidMap = new Map<string, string>();
    for (let otherObject of this.copiedOtherObjects) {
      guidMap.set(otherObject.guid, guid());
      otherObject = otherObject.clone();

      // 新旧小節の拍子を考慮して位置を調整
      otherObject.measurePosition = Fraction.mul(
        otherObject.measurePosition,
        Fraction.div(
          oldChart.timeline.measures[otherObject.measureIndex].beat,
          tl.measures[otherObject.measureIndex + diff].beat
        )
      );
      if (
        otherObject.measurePosition.numerator >=
        otherObject.measurePosition.denominator
      ) {
        continue;
      }

      otherObject.guid = guidMap.get(otherObject.guid)!;
      otherObject.measureIndex += diff;
      otherObject.layer = this.currentChart!.currentLayer.guid;
      otherObject.chart = this.currentChart!;
      tl.addOtherObject(otherObject);
    }
  }

  @action
  private paste() {
    if (!this.existsCurrentChart()) return;
    if (this.inspectorTargets.length !== 1) return;
    if (!(this.inspectorTargets[0] instanceof MeasureRecord)) return;
    this.pasteNotes();
    this.pasteOtherObjects();

    this.notify(
      `${
        this.copiedNotes.length + this.copiedOtherObjects.length
      } 個のオブジェクトを貼り付けました`
    );

    if (this.copiedNotes.length > 0 || this.copiedOtherObjects.length > 0) {
      this.currentChart!.save();
    }
  }

  @action
  changeMeasureDivision(index: number) {
    if (!this.currentChart) {
      return;
    }

    const divs = this.currentChart.musicGameSystem.measureDivisions;
    index += divs.indexOf(this.setting.measureDivision);
    index = Math.max(0, Math.min(divs.length - 1, index));
    this.setting.measureDivision = divs[index];
  }

  @action
  moveLane(indexer: (i: number) => number) {
    const lanes = this.currentChart!.timeline.lanes;
    const notes = this.getInspectNotes();

    notes.forEach((note) => {
      // 移動先レーンを取得
      const lane =
        lanes[indexer(lanes.findIndex((lane) => lane.guid === note.lane))];
      if (lane === undefined) return;

      // 置けないならやめる
      const typeMap = this.currentChart!.musicGameSystem.noteTypeMap;
      const excludeLanes = typeMap.get(note.type)!.excludeLanes || [];
      if (excludeLanes.includes(lane.templateName)) return;

      note.lane = lane.guid;
    });
    if (notes.length > 0) this.currentChart!.save();
  }

  /**
   * 選択中のノートを左右に移動する
   * @param value 移動量
   */
  @action
  private moveSelectedNotes(value: number) {
    const notes = this.getInspectNotes();

    for (const note of notes) {
      const { numerator, denominator } = note.horizontalPosition;
      note.horizontalPosition.numerator = _.clamp(
        numerator + value,
        0,
        denominator - note.horizontalSize
      );
    }
  }

  /**
   * 選択中のノートを左右反転する
   */
  @action
  private flipSelectedNotes() {
    if (!this.currentChart) return;
    const { noteTypeMap } = this.currentChart.musicGameSystem;

    const notes = this.getInspectNotes();

    for (const note of notes) {
      const { numerator, denominator } = note.horizontalPosition;
      note.horizontalPosition.numerator =
        denominator - 1 - numerator - (note.horizontalSize - 1);

      const { mirrorType } = noteTypeMap.get(note.type)!;
      if (mirrorType) {
        note.updateType(mirrorType);
      }
    }

    this.currentChart.musicGameSystem.eventListeners.onMirror?.(notes);
  }

  @action
  moveDivision(index: number) {
    const frac = new Fraction(index, this.setting.measureDivision);
    const notes = this.getInspectNotes();
    const measures = this.currentChart!.timeline.measures;

    notes.forEach((note) => {
      const p = Fraction.add(
        note.measurePosition,
        Fraction.div(frac, measures[note.measureIndex].beat)
      );
      if (p.numerator < 0 && note.measureIndex != 0) {
        note.measureIndex--;
        p.numerator += p.denominator;
      }
      if (p.numerator >= p.denominator) {
        note.measureIndex++;
        p.numerator -= p.denominator;
      }
      note.measurePosition = p;
    });
    this.currentChart!.timeline.calculateTime();
    if (notes.length > 0) this.currentChart!.save();
  }

  /**
   * mod キーを押しているか
   */
  public isPressingModKey = false;

  private activeElementIsInput() {
    return document.activeElement?.tagName === "INPUT";
  }

  private enqueueSnackbar?: (
    message: SnackbarMessage,
    options?: OptionsObject
  ) => SnackbarKey;

  @action
  public setEnqueueSnackbar(
    enqueueSnackbar: (
      message: SnackbarMessage,
      options?: OptionsObject
    ) => SnackbarKey
  ) {
    this.enqueueSnackbar = enqueueSnackbar;
  }

  @box
  public openReloadDialog = false;

  public readonly noteLineContextMenu = new NoteLineContextMenu();

  public constructor() {
    // ファイル
    ipcRenderer.on("open", () => this.open());
    ipcRenderer.on("save", () => this.save());
    ipcRenderer.on("saveAs", () => this.saveAs());
    ipcRenderer.on("importBMS", () => BMSImporter.import());

    Mousetrap.bind("mod", () => (this.setting.isPressingModKey = true));
    Mousetrap.bind(
      "mod",
      () => (this.setting.isPressingModKey = false),
      "keyup"
    );

    // 編集
    Mousetrap.bind("mod+z", () => {
      if (this.activeElementIsInput()) return;
      this.currentChart!.timeline.undo();

      // undo すると直前に編集していた input 要素にフォーカスされる場合がある
      setTimeout(() => {
        if (this.activeElementIsInput()) {
          (document.activeElement as HTMLInputElement)?.blur();
        }
      }, 16);
    });
    Mousetrap.bind("mod+shift+z", () => {
      if (this.activeElementIsInput()) return;
      this.currentChart!.timeline.redo();
    });
    Mousetrap.bind("mod+x", () => {
      if (this.activeElementIsInput()) return;
      this.copy();
      this.copiedNotes.forEach((n) =>
        this.currentChart!.timeline.removeNote(n)
      );
      if (this.copiedNotes.length > 0) this.currentChart!.save();
    });
    Mousetrap.bind("mod+c", () => {
      if (this.activeElementIsInput()) return;
      this.copy();
    });
    Mousetrap.bind("mod+v", () => {
      if (this.activeElementIsInput()) return;
      this.paste();
    });
    Mousetrap.bind(["del", "backspace"], () => {
      if (this.activeElementIsInput()) return;
      const removeNotes = this.inspectorTargets.filter(
        (target) => target instanceof NoteRecord
      ) as Note[];
      removeNotes.forEach((n) => this.currentChart!.timeline.removeNote(n));

      const removeOtherObjects = this.inspectorTargets.filter(
        (target) => target instanceof OtherObjectRecord
      ) as OtherObject[];
      removeOtherObjects.forEach((o) =>
        this.currentChart!.timeline.removeOtherObject(o)
      );

      if (removeNotes.length > 0 || removeOtherObjects.length > 0)
        this.currentChart!.save();
      this.updateInspector();
    });

    ipcRenderer.on("moveDivision", (_: any, index: number) => {
      if (this.activeElementIsInput()) return;
      this.moveDivision(index);
    });
    ipcRenderer.on("moveLane", (_: any, index: number) => {
      if (this.activeElementIsInput()) return;
      this.moveLane((i) => i + index);
      this.moveSelectedNotes(index);
    });
    ipcRenderer.on("flipLane", () => {
      if (this.activeElementIsInput()) return;
      this.moveLane((i) => this.currentChart!.timeline.lanes.length - i - 1);
      this.flipSelectedNotes();
    });

    // 選択
    ipcRenderer.on("changeMeasureDivision", (_: any, index: number) => {
      if (this.activeElementIsInput()) return;
      this.changeMeasureDivision(index);
    });
    ipcRenderer.on("changeObjectSize", (_: any, index: number) => {
      if (this.activeElementIsInput()) return;
      this.setting.setObjectSize(Math.max(1, this.setting.objectSize + index));
    });
    ipcRenderer.on("changeEditMode", (_: any, index: number) => {
      if (this.activeElementIsInput()) return;
      this.setting.setEditMode(index);
    });
    ipcRenderer.on("changeNoteTypeIndex", (_: any, index: number) => {
      if (this.activeElementIsInput()) return;
      const max = this.currentChart!.musicGameSystem.noteTypes.length - 1;
      this.setting.editNoteTypeIndex = Math.min(index, max);
    });

    // 制御
    ipcRenderer.on("toggleMusicPlaying", () => {
      if (this.activeElementIsInput()) return;
      this.currentChart!.isPlaying
        ? this.currentChart!.pause()
        : this.currentChart!.play();
    });

    ipcRenderer.on("reload", () => {
      this.openReloadDialog = true;
    });

    ipcRenderer.on("close", () => {
      for (let i = 0; i < this.charts.length; i++) this.saveConfirm(i);
      localStorage.setItem(
        "filePaths",
        JSON.stringify(this.charts.map((c) => c.filePath).filter((p) => p))
      );
    });

    this.updateServer(this.setting.serverEnabled);

    Editor.instance = this;
    (window as any).extensionUtility = extensionUtility;
  }

  private server: http.Server | null = null;

  public updateServer(enabled: boolean) {
    this.setting.serverEnabled = enabled;

    if (!enabled) {
      this.server?.close();
      this.server = null;
      return;
    }

    this.server = http.createServer();

    this.server.on("request", (req, res) => {
      if (req.url === "/data") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.write(this.currentChart!.toJSON(null));
        res.end();
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.write(
        JSON.stringify({
          name: this.currentChart?.filePath,
          time: this.currentChart?.time,
          updatedAt: this.currentChart?.updatedAt,
        })
      );
      res.end();
    });
    this.server.listen(this.setting.serverPort);
  }
}
