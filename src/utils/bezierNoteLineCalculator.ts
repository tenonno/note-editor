import { NoteLine } from "../objects/NoteLine";
import { LinePoint } from "../objects/LaneRenderer";
import { Measure } from "../objects/Measure";
import { Fraction, inverseLerp, lerp } from "../math";
import { clamp } from "lodash";
import { GetLinePointInfoFromPool } from "./pool";
import { INoteLineCalculator } from "./noteLineUtility";
import { LinePointInfo } from "../objects/Lane";

type W = {
  normalizedX: number;
  normalizedWidth: number;
  value: number;
  measureIndex: number;
};

export class BezierNoteLineCalculator implements INoteLineCalculator {
  private readonly x: number;
  private readonly y: number;

  public readonly headPoint: W;
  public readonly tailPoint: W;

  public constructor(
    noteLine: NoteLine,
    linePoints: LinePoint[],
    private measures: Measure[]
  ) {
    [this.headPoint, this.tailPoint] = linePoints.map((p) => ({
      normalizedX:
        Fraction.to01(p.horizontalPosition) +
        p.horizontalSize / p.horizontalPosition.denominator / 2,
      normalizedWidth: p.horizontalSize / p.horizontalPosition.denominator,
      value: p.measureIndex + Fraction.to01(p.measurePosition),
      measureIndex: p.measureIndex,
    }));

    this.x = noteLine.curve.x;
    this.y = noteLine.curve.y;
  }

  // 値を点に変換
  public getLinePointInfo(measureIndex: number, value: number): LinePointInfo {
    const p1 = this.headPoint;
    const p2 = this.tailPoint;

    const measure = this.measures[measureIndex];

    // ロング全体の縦位置
    const normalizedT = inverseLerp(p1.value, p2.value, value);

    if (normalizedT === Infinity) {
      console.log(p1.value, p2.value, value);
    }

    // 0.0-1.0
    const normalizedMeasureVerticalT = measureIndex + 1 - value;

    // ベジェ逆変換
    // https://www.wolframalpha.com/input?i=Solve%5By%3D%3D1*x*x%2B2*x*%281-x%29*p%2B%281-x%29*%281-x%29*0%2Cx%5D&lang=ja
    const t = this.y == 0.5 ? normalizedT : ((this.y - Math.sqrt(this.y * this.y - 2 * this.y * normalizedT + normalizedT)) / (2 * this.y - 1));
    const ppppX = quadraticBezier(t, p1.normalizedX, this.x, p2.normalizedX);
    const x = measure.x + measure.width * ppppX;
    const y = measure.y + measure.height * normalizedMeasureVerticalT; // - (pos.y - p1Y), // normalizedMeasureVerticalT,;

    const width =
      measure.width * lerp(p1.normalizedWidth, p2.normalizedWidth, normalizedT);

    const clampMeasure = (position: number) => {
      return clamp(position, measure.x, measure.x + measure.width);
    };

    const left = clampMeasure(x - width / 2);
    const right = clampMeasure(x + width / 2);

    return GetLinePointInfoFromPool(
      left,
      y,
      right - left
    );
  }
}

function quadraticBezier(
  t: number,
  x1: number,
  x2: number,
  x3: number
) {
  const tp = 1 - t;
  return t * t * x3 + 2 * t * tp * x2 + tp * tp * x1;
}
