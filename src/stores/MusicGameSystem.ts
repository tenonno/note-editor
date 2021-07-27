import { Howl } from "howler";
import IMusicGameSystemEventListener from "./musicGameSystem/eventListener";

export interface LaneTemplate {
  name: string;
  color: string;
  division: number;
  renderer: string;
  rendererReference: Function;
}

/**
 * 初期レーン情報
 */
interface InitialLane {
  template: string;
  horizontalSize: number;
  horizontalPosition: number;
}

export interface NoteType {
  name: string;
  renderer: string;
  rendererReference: any;
  excludeLanes: string[];

  /**
   * 直角ロングを生成できるか
   */
  allowRightAngle: boolean;

  connectableTypes: string[];

  /**
   * 左右反転した場合のタイプ
   */
  mirrorType: string;

  /**
   * カスタムプロパティ
   */
  customProps: { key: string; defaultValue: any; config?: any }[];
  customPropsInspectorConfig: any;

  /**
   * エディタプロパティ
   */
  editorProps: {
    color: string;
    se: string;
  };
}

export interface OtherObjectType {
  name: string;
  color: string;
  valueType: "number" | "text" | "none";
}

export interface CustomNoteLineRenderer {
  target: string;
  renderer: string;
  rendererReference: any;
}

export type MusicGameSystemMeasureCustomProps = {
  key: string;
  defaultValue: any;
  config: string[] | null;
};

export type MusicGameSystemMeasure = {
  renderer: string;
  rendererReference: any;
  /**
   * カスタムプロパティ
   */
  customProps: MusicGameSystemMeasureCustomProps[];
};

export class HowlPool {
  index = 0;
  howls?: Howl[];
  constructor(factory: any, count: number) {
    this.howls = Array(count);
    (async () => {
      for (var i = 0; i < count; i++) {
        this.howls![i] = (await factory()) as Howl;
      }
    })();
  }
  next() {
    return this.howls![this.index++ % this.howls!.length];
  }
}

export default interface MusicGameSystem {
  name: string;
  version: number;

  difficulties: string[];

  laneTemplates: LaneTemplate[];

  laneTemplateMap: Map<string, LaneTemplate>;

  initialLanes: InitialLane[];
  measureHorizontalDivision: number;
  noteTypes: NoteType[];
  otherObjectTypes: OtherObjectType[];

  /**
   * key: ノートタイプ
   * value: プレイヤー
   */
  seMap: Map<string, HowlPool>;

  noteTypeMap: Map<string, NoteType>;

  customNoteLineRenderers: CustomNoteLineRenderer[];

  customNoteLineRendererMap: Map<string, CustomNoteLineRenderer>;

  measure: MusicGameSystemMeasure;
  measureDivisions: number[];

  customProps: {
    key: string;
    defaultValue: any;
    config: string[] | null;
  }[];

  eventListener: string | string[] | null;
  eventListeners: IMusicGameSystemEventListener;
}
/**
 * 音ゲーシステムを正規化して不正な値を修正する
 * @param musicGameSystem システム
 */
export function normalizeMusicGameSystem(
  musicGameSystem: any
): MusicGameSystem {
  const system: MusicGameSystem = Object.assign(
    {
      difficulties: ["unknown"],
      initialLanes: [],
      laneTemplates: [],
      customNoteLineRenderers: [],
      customProps: [],
      editorProps: [],
      noteTypes: [],
      otherObjectTypes: [],

      measure: {
        renderer: "default",
        customProps: [],
      },
      measureDivisions: [
        1,
        2,
        3,
        4,
        5,
        6,
        8,
        12,
        16,
        24,
        32,
        48,
        64,
        96,
        128,
        192,
      ],
      eventListener: null,
      eventListeners: {},
    },
    musicGameSystem
  );

  for (const noteType of system.noteTypes) {
    noteType.editorProps = Object.assign(
      {
        color: "0xffffff",
      },
      noteType.editorProps
    );
    noteType.excludeLanes = noteType.excludeLanes || [];
    noteType.connectableTypes = noteType.connectableTypes || [];
  }

  return system;
}
