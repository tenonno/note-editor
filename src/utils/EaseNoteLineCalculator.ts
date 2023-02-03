import { CurveType, NoteLine } from "../objects/NoteLine";
import { LinePoint } from "../objects/LaneRenderer";
import { Measure } from "../objects/Measure";
import { Fraction, inverseLerp, lerp } from "../math";
import { GetLinePointInfoFromPool } from "./pool";
import { INoteLineCalculator } from "./noteLineUtility";
import { LinePointInfo } from "../objects/Lane";

type W = {
  x: number;
  width: number;
  value: number;
};

export class EaseNoteLineCalculator implements INoteLineCalculator {

  public readonly headPoint: W;
  public readonly tailPoint: W;
  public readonly ease: (t: number) => number;

  public constructor(
    noteLine: NoteLine,
    linePoints: LinePoint[],
    private measures: Measure[]
  ) {
    [this.headPoint, this.tailPoint] = linePoints.map((p) => ({
      x: Fraction.to01(p.horizontalPosition),
      width: p.horizontalSize / p.horizontalPosition.denominator,
      value: p.measureIndex + Fraction.to01(p.measurePosition),
    }));

    const type = noteLine.curve.type;
    this.ease =
      type == CurveType.EaseInQuad ? t => t * t :
        type == CurveType.EaseOutQuad ? t => t * (2 - t) :
          t => t;
  }

  // 値を点に変換
  public getLinePointInfo(measureIndex: number, value: number): LinePointInfo {
    const p1 = this.headPoint;
    const p2 = this.tailPoint;

    const measure = this.measures[measureIndex];

    const easedT = this.ease(inverseLerp(p1.value, p2.value, value));
    const x = measure.x + measure.width * lerp(p1.x, p2.x, easedT);
    const width = measure.width * lerp(p1.width, p2.width, easedT);

    const normalizedMeasureVerticalT = measureIndex + 1 - value;
    return GetLinePointInfoFromPool(
      x,
      measure.y + measure.height * normalizedMeasureVerticalT,
      width
    );
  }
}
