import { Record } from "immutable";
import * as _ from "lodash";
import * as PIXI from "pixi.js";
import { Fraction, IFraction } from "../math";
import Chart from "../stores/Chart";
import Editor from "../stores/EditorStore";
import { parseRgba } from "../utils/color";
import { GUID } from "../utils/guid";
import { Mutable } from "../utils/mutable";
import { Lane, LinePointInfo } from "./Lane";
import LaneRendererResolver from "./LaneRendererResolver";
import { Measure } from "./Measure";
import Vector2 from "../math/Vector2";
import TimelineObject from "./TimelineObject";

interface INoteEditorProps {
  time: number;
}

export type NoteData = {
  guid: GUID;
  editorProps: INoteEditorProps;

  /**
   * 小節インデックス
   */
  measureIndex: number;
  /**
   * 小節内の位置
   */
  measurePosition: IFraction;

  horizontalSize: number;
  horizontalPosition: Fraction;

  type: string;

  speed: number;

  /**
   * 所属レーンの GUID
   */
  lane: GUID;

  /**
   * 所属レイヤーの GUID
   */
  layer: GUID;

  customProps: any;
};

const defaultNoteData: NoteData = {
  guid: "GUID",
  editorProps: {
    time: 1,
  },
  measureIndex: -1,
  measurePosition: new Fraction(0, 1),

  horizontalSize: 1,
  horizontalPosition: Fraction.none,
  type: "string",
  speed: 1,
  /**
   * 所属レーンの GUID
   */
  lane: "GUID",

  layer: "GUID",

  customProps: {},
};

export type Note = Mutable<NoteRecord>;

export class NoteRecord
  extends Record<NoteData>(defaultNoteData)
  implements TimelineObject {
  static new(data: NoteData, chart: Chart): Note {
    const note = new NoteRecord(data, chart);
    return Object.assign(note, note.asMutable());
  }

  color: number = 0;
  sePlayed: boolean = false;

  chart: Chart;

  getLane(): Lane {
    return this.chart.timeline.laneMap.get(this.lane)!;
  }

  getMeasure(): Measure {
    return this.chart.timeline.measures[this.measureIndex];
  }

  /**
   * updateBounds() を最後に実行した時間
   */
  private lastUpdateBoundsFrame = -1;

  /**
   * ノート領域のキャッシュ
   */
  private boundsCache: LinePointInfo | null = null;

  /**
   * 描画領域を更新する
   */
  public updateBounds(): LinePointInfo | null {
    // キャッシュのチェック
    const { currentFrame } = Editor.instance!;
    if (currentFrame == this.lastUpdateBoundsFrame) {
      return this.boundsCache;
    }

    const lane = this.getLane();

    const linePointInfo = LaneRendererResolver.resolve(lane).getNotePointInfo(
      lane,
      this.getMeasure(),
      this.horizontalPosition,
      this.measurePosition
    );

    // ノートの描画範囲が計算できない場合はレーンを拡張する
    if (!linePointInfo) {
      this.chart.timeline.extendLane(this);
      return null;
    }

    linePointInfo.width *= this.horizontalSize;
    this.x = linePointInfo.point.x;
    this.y = linePointInfo.point.y - 5;
    this.width = linePointInfo.width;
    this.height = 10;

    this.lastUpdateBoundsFrame = Editor.instance!.currentFrame;
    this.boundsCache = linePointInfo;

    return linePointInfo;
  }

  isVisible = false;

  x = 0;
  y = 0;
  width = 0;
  height = 0;

  isSelected = false;

  getMeasurePosition() {
    return this.measureIndex + Fraction.to01(this.measurePosition);
  }

  containsPoint(point: { x: number; y: number }) {
    return (
      _.inRange(point.x, this.x, this.x + this.width) &&
      _.inRange(point.y, this.y, this.y + this.height)
    );
  }

  getBounds() {
    return new PIXI.Rectangle(this.x, this.y, this.width, this.height);
  }

  /**
   * 領域を描画する
   * @param graphics 対象グラフィック
   * @param rgba 枠の色
   */
  public drawBounds(graphics: PIXI.Graphics, rgba: number) {
    const { color, alpha } = parseRgba(rgba);
    const bounds = this.getBounds();
    graphics
      .lineStyle(2, color, alpha)
      .drawRect(
        bounds.x - 2,
        bounds.y - 2,
        bounds.width + 4,
        bounds.height + 4
      );
  }

  /**
   * 他のノートと小節位置が同じか判定する
   * @param note
   */
  public isSameMeasurePosition(note: Note): boolean {
    return (
      this.measureIndex === note.measureIndex &&
      Fraction.equal(this.measurePosition, note.measurePosition)
    );
  }

  private constructor(data: NoteData, chart: Chart) {
    super(
      (() => {
        const noteType = chart.musicGameSystem.noteTypeMap.get(data.type)!;

        if (!noteType) {
          console.log(data);
        }

        // 不要カスタムプロパティの削除と新規カスタムプロパティの追加
        const newProps: any = {
          inspectorConfig: noteType.customPropsInspectorConfig,
        };
        for (const prop of noteType.customProps) {
          if (prop.key in data.customProps) {
            newProps[prop.key] = data.customProps[prop.key];
          } else if (
            typeof prop.defaultValue !== "string" ||
            prop.defaultValue.indexOf("return") === -1
          ) {
            newProps[prop.key] = prop.defaultValue;
          } else {
            newProps[prop.key] = new Function(
              "chart",
              "data",
              prop.defaultValue
            )(chart, data);
          }
        }

        data.customProps = newProps;

        return data;
      })()
    );
    this.chart = chart;

    this.updateColor();
  }

  public updateType(type: string) {
    (this as any).type = type;
    this.updateColor();
  }

  private updateColor() {
    const { chart, type, lane } = this;
    const noteType = chart.musicGameSystem.noteTypeMap.get(type)!;

    if (noteType.editorProps.color === "$laneColor") {
      this.color = Number(
        chart.musicGameSystem.laneTemplateMap.get(
          chart.timeline.laneMap.get(lane)!.templateName
        )!.color
      );
    } else {
      this.color = Number(noteType.editorProps.color);
    }
  }

  public normalize() {
    if (this.horizontalSize < 0) {
      const diff = this.horizontalPosition.numerator - this.horizontalSize;
      (this as any).horizontalPosition = Fraction.withNumerator(
        this.horizontalPosition,
        this.horizontalPosition.numerator + this.horizontalSize
      );
      (this as any).horizontalSize = Math.abs(this.horizontalSize);
    }
  }

  /**
   * クローンする
   */
  public clone() {
    return NoteRecord.new(_.cloneDeep(this.toJS() as NoteData), this.chart);
  }
}

export class NoteResizeInfo {
  public readonly targetNoteClone: Note;

  public constructor(
    public readonly targetNote: Note,
    public readonly mousePosition: Vector2
  ) {
    this.targetNoteClone = targetNote.clone();
  }
}
