import { Fraction } from "../math";
import { Mutable } from "../utils/mutable";
import { Record } from "immutable";
import { GUID } from "../utils/guid";

/**
 * レーンの中間点
 */
export type LanePointData = {
  horizontalSize: number;
  horizontalPosition: Fraction;

  templateName: string;

  color: number; // = 0xffffff;

  guid: GUID;

  /**
   * 小節インデックス
   */
  measureIndex: number;
  /**
   * 小節内の位置
   */
  measurePosition: Fraction;
};

const defaultNoteLineData: LanePointData = {
  guid: "GUID",
  horizontalSize: 0,
  horizontalPosition: Fraction.none,
  templateName: "?",
  measureIndex: 0,
  measurePosition: Fraction.none,
  color: 0xffffff,
};

export type LanePoint = Mutable<LanePointRecord>;

export class LanePointRecord extends Record<LanePointData>(
  defaultNoteLineData
) {
  static new(data: LanePointData): LanePoint {
    return new LanePointRecord(data).asMutable();
  }

  private constructor(data: LanePointData) {
    super(data);
  }

  public clone() {
    return {
      ...this,
      horizontalPosition: Fraction.clone(this.horizontalPosition),
      measurePosition: Fraction.clone(this.measurePosition),
    };
  }
}
