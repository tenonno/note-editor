import { Record } from "immutable";
import { Fraction } from "../math";
import { GUID } from "../utils/guid";
import { Mutable } from "../utils/mutable";
import { OtherObjectType } from "../stores/MusicGameSystem";
import { InspectorConfig } from "../inspector/inspectorController";

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

export class OtherObjectRecord extends Record<OtherObjectData>(
  defaultOtherObjectData
) {
  public static createInstance(
    data: OtherObjectData,
    otherObjectTypes: OtherObjectType[]
  ): OtherObject {
    data.inspectorConfig = {
      splitValues: [],
    };

    if (otherObjectTypes[data.type].splitValueLabels.length > 0) {
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

    const otherObjectRecord = new OtherObjectRecord(data);

    const instance = Object.assign(
      otherObjectRecord,
      otherObjectRecord.asMutable()
    );

    return instance as any;
  }

  private constructor(data: OtherObjectData) {
    super(data);
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
    return this.type == 0;
  }

  /**
   * 速度変更オブジェクトか
   */
  public isSpeed() {
    return this.type == 1;
  }

  /**
   * 停止オブジェクトか
   */
  public isStop() {
    return this.type == 2;
  }
}
