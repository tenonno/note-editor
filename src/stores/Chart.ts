import { Howl } from "howler";
import * as _ from "lodash";
import { action, computed, observable } from "mobx";
import { Fraction } from "../math";
import { Lane } from "../objects/Lane";
import { LanePoint } from "../objects/LanePoint";
import { Layer, LayerData, LayerRecord } from "../objects/Layer";
import { MeasureRecord } from "../objects/Measure";
import {
  Timeline,
  TimelineData,
  TimelineJsonData,
  TimelineRecord,
} from "../objects/Timeline";
import { guid } from "../utils/guid";
import box from "../utils/mobx-box";
import updateChart from "../utils/updateChart";
import Editor from "./EditorStore";
import MusicGameSystem from "./MusicGameSystem";

export type ChartJsonData = {
  name: string;
  version: number;
  editorVersion: number;
  difficulty: number;
  level: string;
  startTime: number;
  developmentStartTime: number;
  musicGameSystem: {
    name: string;
    version: number;
  };
  audio: {
    source: string;
    startTime: number;
  };
  timeline: TimelineJsonData;
  layers: LayerData[];
  customProps: any;
};

export default class Chart {
  // TODO: Record にする
  // data = new ChartRecord();

  version: number = 2;

  timeline: Timeline;

  @observable.shallow
  layers: Layer[] = [];

  @observable
  currentLayerIndex = 0;

  customProps: any = {};

  public updatedAt = Date.now();

  @computed
  get currentLayer() {
    return this.layers[this.currentLayerIndex];
  }

  /**
   * 新規レイヤーを作成する
   */
  @action
  public addLayer({
    name,
    visible,
    lock,
    layerIndex,
  }: {
    name?: string;
    visible?: boolean;
    lock?: boolean;
    layerIndex?: number;
  } = {}) {
    this.layers.splice(
      layerIndex ?? this.currentLayerIndex,
      0,
      LayerRecord.new({
        guid: guid(),
        name: name ?? `レイヤー${this.layers.length + 1}`,
        visible: visible ?? true,
        lock: lock ?? false,
      })
    );

    this.layers = [...this.layers];
  }

  @action
  removeLayer() {
    // 削除対象のノートを列挙する
    const removeNotes = this.timeline.notes.filter(
      (note) => note.layer === this.currentLayer.guid
    );

    if (removeNotes.length) {
      // TODO: 専用のダイアログを作成する
      if (
        window.confirm(
          `${removeNotes.length} 個のノートが削除されます\nレイヤーを削除しますか？`
        )
      ) {
        // TODO: 一括削除する
        for (const note of removeNotes) {
          this.timeline.removeNote(note);
        }
      } else return;
    }

    this.layers = this.layers.filter(
      (_, index) => index !== this.currentLayerIndex
    );

    this.currentLayerIndex = Math.min(
      this.currentLayerIndex,
      this.layers.length - 1
    );
  }

  @action
  selectLayer(index: number) {
    this.currentLayerIndex = index;
  }

  @action
  toggleLayerVisible(index: number) {
    this.selectLayer(index);
    this.currentLayer.visible = !this.currentLayer.visible;
    this.layers = [...this.layers];
  }

  @action
  toggleLayerLock(index: number) {
    this.selectLayer(index);
    this.currentLayer.lock = !this.currentLayer.lock;
    this.layers = [...this.layers];
  }

  @action
  renameLayer(name: string) {
    this.currentLayer.name = name;
    this.layers = [...this.layers];
  }

  /**
   * レイヤーを結合する
   */
  @action
  mergeLayer() {
    // マージするノートを列挙する
    const mergeNotes = this.timeline.notes.filter(
      (note) => note.layer === this.currentLayer.guid
    );

    const nextLayer = this.layers[this.currentLayerIndex + 1];

    for (const note of mergeNotes) {
      note.layer = nextLayer.guid;
    }

    this.removeLayer();
  }

  @observable
  filePath: string | null = null;

  @observable
  canUndo = false;

  @observable
  canRedo = false;

  @action
  save() {
    this.timeline.save();
    this.updatedAt = Date.now();
  }

  public static loadFromJson(json: string) {
    const editor = Editor.instance!;

    const jsonChart: Chart = JSON.parse(json);

    const musicGameSystem = editor.asset.musicGameSystems.find(
      (mgs) => mgs.name === jsonChart.musicGameSystemName
    );

    if (!musicGameSystem) {
      return console.error(
        "MusicGameSystem が見つかりません",
        jsonChart.musicGameSystemName,
        jsonChart.musicGameSystemVersion
      );
    }
    if (musicGameSystem.version !== jsonChart.musicGameSystemVersion) {
      // TODO: 更新処理を実装する
      editor.notify(
        `${musicGameSystem.name} のバージョンが異なります`,
        "warning"
      );
    }

    const chart = editor.newChart(musicGameSystem, jsonChart.audioSource!);
    chart.load(json);
    editor.setCurrentChart(editor.charts.length - 1);
  }

  /**
   * 小節を生成する
   * @param index 小節番号
   */
  private createMeasure(index: number) {
    const customProps = this.musicGameSystem.measure.customProps.reduce(
      (object: any, customProps) => {
        object[customProps.key] = customProps.defaultValue;
        return object;
      },
      {}
    );

    return MeasureRecord.new(
      {
        index,
        beat: new Fraction(4, 4),
        customProps,
      },
      this.musicGameSystem.measure
    );
  }

  @action
  private load(json: string) {
    const chartData: ChartJsonData = JSON.parse(json);
    console.log("譜面を読み込みます", chartData);

    updateChart(chartData, this.version);

    // 譜面のカスタムオプションを読み込む
    (() => {
      const data = chartData.customProps || {};

      const newProps: any = {};
      for (const prop of this.musicGameSystem.customProps) {
        if (prop.key in data) {
          newProps[prop.key] = data[prop.key];
        } else {
          newProps[prop.key] = prop.defaultValue;
        }
      }

      this.customProps = newProps;
    })();

    // 初期レーンのguidを固定
    if (chartData.version <= 1) {
      for (let i = 0; i < this.musicGameSystem.initialLanes.length; i++) {
        const guid = "initialLane" + i;
        const oldGuid = chartData.timeline.lanes[i].guid;
        chartData.timeline.lanes[i].guid = guid;
        for (const note of chartData.timeline.notes) {
          if (note.lane == oldGuid) {
            note.lane = guid;
          }
        }
      }
      // 以前コピペされたゴミデータを削除
      const layers = chartData.layers.map((lane: any) => lane.guid);
      layers.push(undefined);
      const lanes = chartData.timeline.lanes.map((lane: any) => lane.guid);
      chartData.timeline.notes = chartData.timeline.notes.filter(
        (note: any) => layers.includes(note.layer) && lanes.includes(note.lane)
      );
    }

    const timelineData: TimelineJsonData = chartData.timeline;

    // 1000 小節まで生成する
    for (let i = timelineData.measures.length; i <= 999; i++) {
      timelineData.measures.push({
        index: i,
        beat: new Fraction(4, 4),
        customProps: {},
      });
    }

    // 小節のカスタムプロパティを生成する
    for (const [index, measure] of timelineData.measures.entries()) {
      measure.customProps = Object.assign(
        this.createMeasure(index).customProps,
        measure.customProps
      );
    }

    this.timeline = TimelineRecord.new(this, timelineData as TimelineData);

    const layers = (chartData.layers || []) as LayerData[];

    // 譜面にレイヤー情報がなければ初期レイヤーを生成する
    if (layers.length === 0) {
      layers.push({
        guid: guid(),
        name: "レイヤー1",
        visible: true,
        lock: false,
      });
      // 全ノートを初期レイヤーに割り当てる
      for (const note of this.timeline.notes) {
        note.layer = layers[0].guid;
      }
    }

    this.layers = layers.map((layer) => LayerRecord.new(layer));

    // ロックしていないレイヤーがあれば選択する
    const notLockedLayerIndex = this.layers.findIndex((layer) => !layer.lock);
    this.selectLayer(notLockedLayerIndex === -1 ? 0 : notLockedLayerIndex);

    this.setName(chartData.name);
    this.setStartTime(chartData.startTime);
    this.setDifficulty(chartData.difficulty || 0);
    this.level = chartData.level;
    this.developmentStartTime = chartData.developmentStartTime || 0;
  }

  constructor(musicGameSystem: MusicGameSystem, audioSource: string) {
    this.musicGameSystem = musicGameSystem;
    this.timeline = TimelineRecord.new(this);
    this.setAudioFromSource(audioSource);
  }

  @observable
  name: string = "新規譜面";

  @action
  setName = (name: string) => (this.name = name);

  @observable
  difficulty: number = 0;

  @action
  setDifficulty(difficulty: number) {
    this.difficulty = difficulty;
  }

  @box
  public level: string = "0";

  @box
  public musicGameSystem: MusicGameSystem;

  @observable
  audio?: Howl;

  @observable
  audioSource?: string;

  @observable
  audioBuffer?: AudioBuffer;

  @observable
  volume: number = 1.0;

  @observable
  speed: number = 1.0;

  @observable
  seVolume: number = 1.0;

  @observable
  startTime: number = 0.0;

  @box
  public developmentStartTime = 0.0;

  @action
  setStartTime(startTime: number) {
    this.startTime = startTime;
  }

  @action
  setVolume(value: number) {
    this.volume = value;
    this.audio!.volume(value);
  }

  @action
  setSpeed(value: number) {
    this.speed = value;
    this.audio!.rate(value);
  }

  @action
  setSeVolume(value: number) {
    this.seVolume = value;
  }

  @computed
  get normalizedPosition() {
    return this.time / this.audio!.duration();
  }

  @action
  private setAudioBuffer(ab: AudioBuffer) {
    this.audioBuffer = ab;
  }

  @action
  resetAudio() {
    delete this.audio;
    delete this.audioBuffer;
    delete this.audioSource;
  }

  @observable
  isPlaying: boolean = false;

  @action
  private setIsPlaying = (value: boolean) => (this.isPlaying = value);

  @action
  pause() {
    if (!this.audio) return;
    this.audio!.pause();

    this.isPlaying = false;
  }

  @action
  play(volume: number = 0.5) {
    if (!this.audio) return;

    this.isPlaying = true;

    if ((window as any).ps) (window as any).ps.stop();
    (window as any).ps = this.audio;

    this.audio!.seek(this.time);
    this.audio!.rate(this.speed);

    this.audio!.play();
  }

  // 現在時刻
  // ※ setTime か updateTime を呼ばないと更新されない
  @observable
  time: number = 0;

  @action
  public setTime = (time: number, seek: boolean = false) => {
    this.time = _.clamp(time, 0, this.audio!.duration());

    if (seek) this.audio!.seek(time);
  };

  @action
  private setAudioFromSource(source: string) {
    const audioBuffer = Editor.instance!.asset.loadAudioAsset(source);

    if (!audioBuffer) {
      return;
    }

    this.setAudio(audioBuffer, source);
  }

  public updateTime() {
    if (!this.audio) return;
    const time = this.audio!.seek() as number;
    if (this.time !== time) this.setTime(time);
  }

  @action
  public setAudio(buffer: Buffer, source: string) {
    const extension = source.split(".").pop()!;

    const blob = new Blob([buffer], { type: `audio/${extension}` });
    const src = URL.createObjectURL(blob);

    // 既に楽曲が存在したら
    if (this.audio) {
      this.audio.off("end");
    }

    this.audio = new Howl({ src, format: [extension] });

    this.audio.on("end", () => this.setIsPlaying(false));

    // 秒数リセット
    this.setTime(0);
    this.isPlaying = false;

    this.audioSource = source;

    if ((window as any).ps) (window as any).ps.stop();

    const context: AudioContext = (this.audio as any)._sounds[0]._node.context;

    const originalDecodeAudioData = context.decodeAudioData as any;
    (context as any).decodeAudioData = async (...args: any[]) => {
      const audioBuffer = await originalDecodeAudioData.call(context, ...args);
      this.setAudioBuffer(audioBuffer);
      return audioBuffer;
    };
  }

  private musicGameSystemName = "";
  private musicGameSystemVersion = 0;

  /**
   * 初期小節を読み込む
   */
  @action
  loadInitialMeasures() {
    this.timeline.setMeasures(
      Array(1000)
        .fill(0)
        .map((_, index) =>
          MeasureRecord.new(
            {
              index,
              beat: new Fraction(4, 4),
              customProps: {},
            },
            this.musicGameSystem.measure
          )
        )
    );
  }

  /**
   * 初期レーンを読み込む
   */
  @action
  loadInitialLanes() {
    const musicGameSystem = this.musicGameSystem;

    musicGameSystem.initialLanes.forEach((initialLane, index) => {
      const laneTemplate = musicGameSystem.laneTemplateMap.get(
        initialLane.template
      )!;

      const lanePoints = Array.from({ length: 2 }).map((_, index) => {
        const newLanePoint = {
          measureIndex: index * 300,
          measurePosition: new Fraction(0, 1),
          guid: guid(),
          color: Number(laneTemplate.color),
          horizontalSize: initialLane.horizontalSize,
          templateName: laneTemplate.name,
          horizontalPosition: new Fraction(
            initialLane.horizontalPosition,
            musicGameSystem.measureHorizontalDivision
          ),
        } as LanePoint;

        this.timeline.addLanePoint(newLanePoint);

        return newLanePoint.guid;
      });

      const newLane = {
        guid: "initialLane" + index,
        templateName: laneTemplate.name,
        division: laneTemplate.division,
        points: lanePoints,
      } as Lane;
      this.timeline.addLane(newLane);
    });
  }

  @action
  public toJSON(space: number | null = 2): string {
    if (!this.musicGameSystem) return "{}";

    // 最終小節のインデックスを取得
    const audioDuration = this.audio!.duration() - this.startTime;
    const lastMeasureIndex = this.timeline.measures.findIndex(
      (measure) => measure.endTime >= audioDuration
    );

    let chart = Object.assign({}, this);

    // @ts-ignore
    delete chart.filePath;
    delete chart.audio;
    delete chart.audioBuffer;
    // @ts-ignore
    delete chart.isPlaying;
    // @ts-ignore
    delete chart.volume;
    // @ts-ignore
    delete chart.seVolume;
    // @ts-ignore
    delete chart.speed;
    // @ts-ignore
    delete (chart as any)._musicGameSystem;
    // @ts-ignore
    delete chart.musicGameSystem;
    // @ts-ignore
    delete chart.currentLayerIndex;
    // @ts-ignore
    delete chart.canRedo;
    // @ts-ignore
    delete chart.canUndo;
    // @ts-ignore
    delete chart.updatedAt;

    chart.level = (chart as any)._level;
    delete (chart as any)._level;

    chart.developmentStartTime = (chart as any)._developmentStartTime;
    delete (chart as any)._developmentStartTime;

    chart.musicGameSystemName = this.musicGameSystem.name;
    chart.musicGameSystemVersion = this.musicGameSystem.version;

    chart.timeline = TimelineRecord.newnew(
      this,
      chart.timeline.toJS() as TimelineData
    );

    // @ts-ignore
    delete chart.time;

    chart.timeline.measures = chart.timeline.measures.slice(
      0,
      lastMeasureIndex
    );

    chart = JSON.parse(JSON.stringify(chart));
    const deleteConfigKey = (obj: any) => {
      for (const key of Object.keys(obj)) {
        if (key == "inspectorConfig") delete obj[key];
        else if (obj[key] instanceof Object) deleteConfigKey(obj[key]);
      }
    };
    deleteConfigKey(chart);

    if (space === null) {
      return JSON.stringify(chart);
    }

    return JSON.stringify(chart, null, 2);
  }
}
