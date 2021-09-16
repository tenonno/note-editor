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

  inspectorConfig?: InspectorConfig;
};

const defaultOtherObjectData: OtherObjectData = {
  type: 0,
  guid: "",
  measureIndex: 0,
  measurePosition: Fraction.none,
  value: 1,
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
    // console.warn(data);

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

    console.log(otherObjectRecord);

    /*
    if (data.type === 3) {
      console.warn(otherObjectTypes[data.type]);
    }
    */

    const instance = Object.assign(
      otherObjectRecord,
      otherObjectRecord.asMutable()
    );

    /*
    (instance as any).values =
      otherObjectTypes[data.type].valueCount > 1 ? 1 : undefined;
 */
    console.log(instance);
    console.log(instance.toJS());

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
