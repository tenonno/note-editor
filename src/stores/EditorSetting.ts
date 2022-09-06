import * as _ from "lodash";
import { action, computed, observable, observe } from "mobx";
import { verifyNumber } from "../math";
import {
  DefaultMeasureLayout,
  GameMeasureLayout,
  IMeasureLayout,
} from "../objects/MeasureLayout";
import box from "../utils/mobx-box";
import fs from "fs";
import path from "path";

/**
 * 編集モード
 */
export enum EditMode {
  Select = 1,
  Add,
  Delete,
  Connect,
}

/**
 *
 */
export enum ObjectCategory {
  // ノート
  Note = 1,
  // レーン
  Lane,
  // 特殊
  Other,
}

/**
 * 譜面タブのラベル
 */
export enum ChartTabLabelType {
  Name,
  FilePath,
}

export interface ObjectVisibility {
  lanePoint: boolean;
}

export default class EditorSetting {
  constructor() {
    this.load();
    observe(this, () => this.save());
  }

  @action
  private save() {
    const setting = _.clone(this);

    // 保存してはいけないプロパティを削除する
    // @ts-ignore
    delete setting.measureLayouts;
    // @ts-ignore
    delete setting.objectSizes;
    localStorage.setItem("editorSetting", JSON.stringify(setting));
  }

  /**
   * エディタ設定を読み込む
   */
  @action
  load() {
    const editorSetting = localStorage.getItem("editorSetting");
    if (editorSetting) {
      _.merge(this, JSON.parse(editorSetting));
    }
    this.initializeObjectSizes();
  }

  /**
   * テーマ（仮）
   * TODO: 専用クラスを作る
   */
  public theme = {
    hover: 0xff990099,
    selected: 0xff9900ff,
  };

  /**
   * material-ui のテーマ
   */
  @observable
  public muiThemeType: "light" | "dark" = "light";

  /**
   * material-ui のテーマを切り替える
   */
  @action
  public toggleMuiTheme() {
    this.muiThemeType = this.muiThemeType === "light" ? "dark" : "light";
  }

  @observable
  public backgroundImagePath: string | null = null;

  @observable
  public backgroundImageUrl: string | null = null;

  @action
  public setBackgroundImagePath(imagePath: string | null, assetsPath: string) {
    this.backgroundImagePath = imagePath;
    this.backgroundImageUrl = null;

    if (imagePath === null) {
      return;
    }

    const buffer = fs.readFileSync(path.join(assetsPath, imagePath));
    const mime = `image/${path.extname(imagePath).substr(1)}`;
    const encoding: BufferEncoding = "base64";
    const data = buffer.toString(encoding);
    this.backgroundImageUrl = "data:" + mime + ";" + encoding + "," + data;
  }

  @observable
  customPropColor = "#ff0000";

  @action
  setCustomPropColor(color: string) {
    this.customPropColor = color;
  }

  @observable
  editMode = EditMode.Select;
  @action
  setEditMode = (value: EditMode) => (this.editMode = value);

  @observable
  objectVisibility: ObjectVisibility = {
    lanePoint: true,
  };

  @action
  setObjectVisibility(objectVisibility: any) {
    this.objectVisibility = Object.assign(
      this.objectVisibility,
      objectVisibility
    );
  }

  @observable
  editObjectCategory = ObjectCategory.Note;
  @action
  setEditObjectCategory = (value: ObjectCategory) =>
    (this.editObjectCategory = value);

  @box
  public editNoteTypeIndex = 0;

  @observable
  editLaneTypeIndex = 0;

  @action
  setEditLaneTypeIndex = (value: number) => (this.editLaneTypeIndex = value);

  @observable
  editOtherTypeIndex = 0;

  @action
  setEditOtherTypeIndex(value: number) {
    this.editOtherTypeIndex = value;
  }

  @observable
  measureWidth = 300;

  @action
  setMeasureWidth(value: number) {
    this.measureWidth = value;
  }

  @observable
  measureHeight = 300;

  @action
  setMeasureHeight(value: number) {
    this.measureHeight = value;
  }

  @observable
  verticalLaneCount = 3;

  @action
  setVerticalLaneCount = (value: number) =>
    (this.verticalLaneCount = verifyNumber(value, 1));

  @box
  public horizontalPadding: number = 120;

  @box
  public verticalPadding: number = 40;

  @observable
  reverseScroll = false;

  @action
  setReverseScroll(value: boolean) {
    this.reverseScroll = value;
  }

  /**
   * 1 小節の分割数
   */
  @observable
  measureDivision: number = 4;

  @action
  setMeasureDivision = (value: number) => (this.measureDivision = value);

  @observable
  private objectSizes: number[] = [];

  /**
   * objectSizes の要素数が足りなかったら拡張
   */
  @action
  private initializeObjectSizes() {
    const maxNoteTypes = 20;
    if (maxNoteTypes >= this.objectSizes.length) {
      this.objectSizes = [
        ...this.objectSizes,
        ...Array.from<number>({
          length: maxNoteTypes - this.objectSizes.length + 1,
        }).fill(1),
      ];
    }
  }

  @computed
  public get objectSize() {
    return this.objectSizes[this.editNoteTypeIndex];
  }

  @action
  public setObjectSize(value: number) {
    this.objectSizes[this.editNoteTypeIndex] = value;
  }

  @box
  public otherValues = new Map<string, number | string>();

  measureLayouts: IMeasureLayout[] = [
    new DefaultMeasureLayout(),
    new GameMeasureLayout(),
  ];

  @observable
  currentMeasureLayoutIndex = 0;

  @action
  setCurrentMeasureLayoutIndex(index: number) {
    this.currentMeasureLayoutIndex = index;
  }

  @computed
  get measureLayout() {
    return this.measureLayouts[this.currentMeasureLayoutIndex];
  }

  @box
  public currentInspectorIndex = 0;

  public readonly inspectorNames = ["Tweakpane", "dat.GUI"];

  @observable
  preserve3D = false;

  @observable
  rotateX = 10;

  @observable
  scale3D = 2;

  @observable
  perspective = 150;

  @action
  set3D(enabled: boolean, rotate: number, scale: number, perspective: number) {
    this.preserve3D = enabled;
    this.rotateX = rotate;
    this.scale3D = scale;
    this.perspective = perspective;
  }

  @box
  public tabLabelType = ChartTabLabelType.Name;

  @box
  public tabHeight = 0;

  @box
  public drawerOpened = true;

  @box
  public serverEnabled = false;

  @box
  public serverPort = 3000;

  /**
   * mod キーを押しているか
   */
  public isPressingModKey = false;
}
