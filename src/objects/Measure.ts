import { Record } from "immutable";
import { Fraction, IFraction } from "../math";
import {
  MusicGameSystemMeasure,
  MusicGameSystemMeasureCustomProps,
} from "../stores/MusicGameSystem";
import { parseRgba } from "../utils/color";
import { Mutable } from "../utils/mutable";
import { Graphics, Rectangle } from "pixi.js";
import Pixi from "../containers/Pixi";
import { inRange } from "lodash";

export interface IMeasureCustomProps {
  [key: string]: {
    defaultValue: any;
    items: string[] | null;
  };
}

export type MeasureData = {
  index: number;
  beat: IFraction;
  invisibleLine: boolean;
  customProps: any;
};

const defaultMeasureData: MeasureData = {
  index: -1,
  beat: Fraction.none,
  invisibleLine: false,
  customProps: {},
};

export type Measure = Mutable<MeasureRecord>;

/**
 * 小節
 */
export class MeasureRecord extends Record<MeasureData>(defaultMeasureData) {
  static new(data: MeasureData, config: MusicGameSystemMeasure): Measure {
    const measure = new MeasureRecord(data);
    const mutableMeasure = Object.assign(measure, measure.asMutable());

    mutableMeasure.customProps.inspectorConfig = config.customProps.reduce(
      (obj: any, customProp: MusicGameSystemMeasureCustomProps) => {
        obj[customProp.key] = customProp.config;
        return obj;
      },
      {}
    );

    return mutableMeasure;
  }

  private constructor(data: MeasureData) {
    super(data);
  }

  beginTime = 0;
  endTime = 0;

  containsCurrentTime = false;
  currentTimePosition = 0;

  isVisible = false;

  public x = 0;
  public y = 0;
  public width = 0;

  private _height = 0;
  private _totalHeight = 0;

  /**
   * 全ての小節を一直線に並べた場合の高さ
   */
  public get totalHeight() {
    return this._totalHeight;
  }

  public get height() {
    return this._height;
  }

  public setHeight(height: number, totalHeight: number) {
    this._height = height;
    this._totalHeight = totalHeight;
  }

  containsPoint(point: { x: number; y: number }) {
    return (
      inRange(point.x, this.x, this.x + this.width) &&
      inRange(point.y, this.y, this.y + this.height)
    );
  }

  getBounds() {
    return new Rectangle(
      this.x + Pixi.debugGraphics!.x,
      this.y,
      this.width,
      this.height
    );
  }

  /**
   * 選択されているか
   */
  public isSelected = false;

  /**
   * 領域を描画する
   * @param graphics 対象グラフィック
   * @param rgba 枠の色
   */
  public drawBounds(graphics: Graphics, rgba: number) {
    const { color, alpha } = parseRgba(rgba);
    graphics
      .lineStyle(2, color, alpha)
      .drawRect(this.x - 4, this.y - 4, this.width + 8, this.height + 8);
  }
}

export interface MeasureObject {
  measureIndex: number;
  measurePosition: IFraction;
}

interface MeasureDataObject {
  measureIndex: number;
  measurePosition: IFraction;
}

export function sortMeasure(a: MeasureObject, b: MeasureObject) {
  const v1 = a.measureIndex + Fraction.to01(a.measurePosition);
  const v2 = b.measureIndex + Fraction.to01(b.measurePosition);

  return v1 - v2;
}

export function sortMeasureData(a: MeasureDataObject, b: MeasureDataObject) {
  const v1 = a.measureIndex + Fraction.to01(a.measurePosition);
  const v2 = b.measureIndex + Fraction.to01(b.measurePosition);

  return v1 - v2;
}
