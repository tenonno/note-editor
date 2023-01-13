import { NoteLine } from "../objects/NoteLine";
import Chart from "../stores/Chart";
import { LinePoint } from "../objects/LaneRenderer";
import { Measure, sortMeasure } from "../objects/Measure";
import { Fraction, inverseLerp, lerp, Vector2 } from "../math";
import { clamp } from "lodash";
import { GetLinePointInfoFromPool } from "./pool";
import { Graphics } from "pixi.js";
import { ICurveNoteLineCalculator, noteToLanePoint } from "./noteLineUtility";
import { LinePointInfo } from "../objects/Lane";

type W = {
  normalizedX: number;
  normalizedWidth: number;
  value: number;
  measureIndex: number;
};

export class BezierNoteLineCalculator implements ICurveNoteLineCalculator {
  private readonly bezier: Bezier;

  public static fromNoteLine(noteLine: NoteLine, chart: Chart) {
    const headNote = chart.timeline.noteMap.get(noteLine.head)!;
    const tailNote = chart.timeline.noteMap.get(noteLine.tail)!;

    headNote.updateBounds();
    tailNote.updateBounds();

    const headLinePoint = noteToLanePoint(
      headNote,
      headNote.getBounds(),
      chart.timeline.measures
    );
    const tailLinePoint = noteToLanePoint(
      tailNote,
      tailNote.getBounds(),
      chart.timeline.measures
    );

    return new BezierNoteLineCalculator(
      noteLine,
      [headLinePoint, tailLinePoint],
      chart.timeline.measures
    );
  }

  public readonly headPoint: W;
  public readonly tailPoint: W;

  public constructor(
    noteLine: NoteLine,
    linePoints: LinePoint[],
    private measures: Measure[]
  ) {
    [this.headPoint, this.tailPoint] = linePoints
      .slice()
      .sort(sortMeasure)
      .map((p) => ({
        normalizedX:
          Fraction.to01(p.horizontalPosition) +
          p.horizontalSize / p.horizontalPosition.denominator / 2,
        normalizedWidth: p.horizontalSize / p.horizontalPosition.denominator,
        value: p.measureIndex + Fraction.to01(p.measurePosition),
        measureIndex: p.measureIndex,
      }));

    const measureHeight = measures[0].height;

    this.bezier = new Bezier(
      noteLine,
      this.headPoint,
      this.tailPoint,
      measureHeight
    );
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

    const ppppX = this.bezier.get(normalizedT);
    const x = measure.x + measure.width * ppppX;
    const y = measure.y + measure.height * normalizedMeasureVerticalT; // - (pos.y - p1Y), // normalizedMeasureVerticalT,;

    const width =
      measure.width * lerp(p1.normalizedWidth, p2.normalizedWidth, normalizedT);

    const clampMeasure = (position: number) => {
      return clamp(position, measure.x, measure.x + measure.width);
    };

    const left = clampMeasure(x - width / 2);
    const right = clampMeasure(x + width / 2);
    const clampedWidth = right - left;

    return GetLinePointInfoFromPool(
      (left + right) / 2.0 - clampedWidth / 2.0,
      y,
      clampedWidth
    );
  }

  public debug(graphics: Graphics) {
    this.bezier.debug(graphics);
  }
}

class Bezier {
  private normalizedPoints: (Vector2 & { t: number })[] = [];

  public constructor(
    noteLine: NoteLine,
    startPoint: W,
    endPoint: W,
    measureHeight: number
  ) {
    const div = Math.max(
      10,
      Math.floor(((endPoint.value - startPoint.value) * measureHeight) / 10)
    );

    const p1Y = 0;
    const p2Y = 1;

    const controlPoint = {
      x: noteLine.curve.x,
      y: noteLine.curve.y,
    };

    for (let y = 0; y <= div; y++) {
      const t = (1.0 / div) * y;

      const pos = quadraticBezier(
        t,
        startPoint.normalizedX,
        p1Y,
        controlPoint.x,
        controlPoint.y,
        endPoint.normalizedX,
        p2Y
      );

      this.normalizedPoints.push(Object.assign(pos, { t }));
    }
  }

  public get(t: number): number {
    const get = (index: number) => {
      const n = inverseLerp(
        this.normalizedPoints[index].y,
        this.normalizedPoints[index + 1].y,
        t
      );

      return lerp(
        this.normalizedPoints[index].x,
        this.normalizedPoints[index + 1].x,
        n
      );
    };

    for (let i = 0; i < this.normalizedPoints.length - 1; i++) {
      if (
        this.normalizedPoints[i].y <= t &&
        this.normalizedPoints[i + 1].y >= t
      ) {
        return get(i);
      }
    }

    console.warn("想定外");
    return get(this.normalizedPoints.length - 2);
  }

  public debug(graphics: Graphics, size = 200) {
    graphics.beginFill(0xffffff).drawRect(0, 0, size, size).endFill();

    for (let i = 0; i < this.normalizedPoints.length - 1; i++) {
      graphics
        .lineStyle(1, 0xff0000)
        .moveTo(
          this.normalizedPoints[i].x * size,
          size - this.normalizedPoints[i].y * size
        )
        .lineTo(
          this.normalizedPoints[i + 1].x * size,
          size - this.normalizedPoints[i + 1].y * size
        );
    }
  }
}

function quadraticBezier(
  t: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number
) {
  const tp = 1 - t;
  const x = t * t * x3 + 2 * t * tp * x2 + tp * tp * x1;
  const y = t * t * y3 + 2 * t * tp * y2 + tp * tp * y1;
  return new Vector2(x, y);
}
