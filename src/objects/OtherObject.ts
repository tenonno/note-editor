import { Record } from "immutable";
import { Fraction, inverseLerp } from "../math";
import { GUID } from "../utils/guid";
import { Mutable } from "../utils/mutable";
import { InspectorConfig } from "../inspector/inspectorController";
import TimelineObject from "./TimelineObject";
import { Graphics, Rectangle } from "pixi.js";
import { OtherObjectRenderer } from "./OtherObjectRenderer";
import Chart from "../stores/Chart";
import * as _ from "lodash";
import { OtherObjectPointOption } from "../stores/MusicGameSystem";

export type OtherObjectData = {
  type: number;
  value: number | string;
  guid: GUID;

  /**
   * 小節インデックス
   */
  measureIndex: number;
  /**
   * 小節内の位置
   */
  measurePosition: Fraction;

  layer: GUID;

  inspectorConfig?: InspectorConfig;
};

const defaultOtherObjectData: OtherObjectData = {
  type: 0,
  guid: "",
  measureIndex: 0,
  measurePosition: Fraction.none,
  value: 1,
  layer: "",
  inspectorConfig: undefined,
};

export type OtherObject = Mutable<OtherObjectRecord>;

export class InspectorPointValue {
  private _x: number;
  private _y: number;

  public get x() {
    return this._x;
  }

  public get y() {
    return this._y;
  }

  public set(x: number, y: number) {
    this._x = x;
    this._y = y;
    this.apply();
  }

  public apply() {
    this.otherObject.value = `${this._x},${this._y}`;
  }

  public get normalizedPoint() {
    return {
      x: inverseLerp(this.option.x.min, this.option.x.max, this._x),
      y: inverseLerp(this.option.y.min, this.option.y.max, this._y),
    };
  }

  public constructor(
    private otherObject: OtherObject,
    public option: OtherObjectPointOption
  ) {
    const values = otherObject.value.toString().split(",");

    if (values.length === 2) {
      const v1 = Number(values[0]);
      const v2 = Number(values[1]);
      if (!Number.isNaN(v1) && !Number.isNaN(v2)) {
        this._x = v1;
        this._y = v2;
        return;
      }
    }

    this._x = 0;
    this._y = 0;
  }
}

export class OtherObjectRecord
  extends Record<OtherObjectData>(defaultOtherObjectData)
  implements TimelineObject {
  public pointValue?: InspectorPointValue;

  public static createInstance(
    data: OtherObjectData,
    chart: Chart
  ): OtherObject {
    data.inspectorConfig = {
      splitValues: [],
      ignoreKeys: [],
    };

    const { otherObjectTypes } = chart.musicGameSystem;
    const otherObjectType = otherObjectTypes[data.type];

    if (otherObjectType.splitValueLabels.length > 0) {
      data.inspectorConfig?.splitValues.push({
        key: "value",
        labels: otherObjectTypes[data.type].splitValueLabels,
        pointLabel: otherObjectTypes[data.type].splitValuePointLabel,
        pointParams: {
          x: { min: -1, max: 1, step: 0.1 },
          y: { min: -1, max: 1, step: 0.1 },
          picker: "inline",
          expanded: true,
        },
      });
    }

    const otherObjectRecord = new OtherObjectRecord(data, chart);

    const instance = Object.assign(
      otherObjectRecord,
      otherObjectRecord.asMutable()
    );

    switch (otherObjectType.valueType) {
      case "point":
        if (!otherObjectType.pointOption) {
          console.error("otherObjectType.pointOption が定義されていません");
        }

        instance.pointValue = new InspectorPointValue(
          instance as any,
          otherObjectType.pointOption!
        );
        instance.inspectorConfig!.ignoreKeys!.push("value");
        break;
    }

    return instance as any;
  }

  private constructor(data: OtherObjectData, public readonly chart: Chart) {
    super(data);
  }

  /**
   * toJS で残らないがインスペクタで表示したい要素
   */
  public readonly inspectorTargetKeys = ["pointValue"];

  public drawBounds(graphics: Graphics, rgba: number): void {
    OtherObjectRenderer.drawBounds(
      this as OtherObject,
      this.chart.timeline.measures[this.measureIndex],
      graphics,
      rgba
    );
  }

  /**
   * 小節位置を取得する
   */
  public getMeasurePosition() {
    return this.measureIndex + Fraction.to01(this.measurePosition);
  }

  /**
   * BPMオブジェクトか
   */
  public isBPM() {
    return this.type === 0;
  }

  /**
   * 速度変更オブジェクトか
   */
  public isSpeed() {
    return this.type === 1;
  }

  /**
   * 停止オブジェクトか
   */
  public isStop() {
    return this.type === 2;
  }

  public isSelected = false;
  public isVisible = true;

  public getBounds(): Rectangle {
    return OtherObjectRenderer.getBounds(
      this as OtherObject,
      this.chart.timeline.measures[this.measureIndex]
    );
  }

  /**
   * クローンする
   */
  public clone() {
    return OtherObjectRecord.createInstance(
      _.cloneDeep(this.toJS() as OtherObjectData),
      this.chart
    );
  }
}
