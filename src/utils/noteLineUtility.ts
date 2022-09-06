import { NoteLine } from "../objects/NoteLine";
import { Measure, sortMeasure } from "../objects/Measure";
import { Graphics } from "pixi.js";
import { Fraction, inverseLerp, lerp, Vector2 } from "../math";
import { NoteLineInfo } from "../objects/Lane";
import { GetLineInfoFromPool, GetLinePointInfoFromPool } from "./pool";
import { LinePoint } from "../objects/LaneRenderer";
import { clamp } from "lodash";

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

export type W = {
  normalizedX: number;
  normalizedWidth: number;
  value: number;
  measureIndex: number;
};

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
      x: noteLine.bezier.x,
      y: noteLine.bezier.y,
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

export function getQuadraticBezierLines(
  points: LinePoint[],
  noteLine: NoteLine,
  measures: Measure[],
  debugGraphics?: Graphics
): NoteLineInfo[] {
  if (points.length !== 2) {
    console.error("想定外です");
    return [];
  }

  const lines: NoteLineInfo[] = [];

  const _points = points
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

  const b = new Bezier(noteLine, _points[0], _points[1], measures[0].height);
  if (debugGraphics) {
    b.debug(debugGraphics);
  }

  for (let i = 0; i < _points.length - 1; ++i) {
    const p1 = _points[i];
    const p2 = _points[i + 1];

    // 値を点に変換
    const toLinePointInfo = (measureIndex: number, value: number) => {
      const measure = measures[measureIndex];
      inverseLerp(p1.value, p2.value, value);

      // ロング全体の縦位置
      const normalizedT = inverseLerp(p1.value, p2.value, value);

      // 0.0-1.0
      const normalizedMeasureVerticalT = measureIndex + 1 - value;

      const ppppX = b.get(normalizedT);
      const x = measure.x + measure.width * ppppX;
      const y = measure.y + measure.height * normalizedMeasureVerticalT; // - (pos.y - p1Y), // normalizedMeasureVerticalT,;

      const width =
        measure.width *
        lerp(p1.normalizedWidth, p2.normalizedWidth, normalizedT);

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
    };

    // 始点の小節番号
    let v1 = p1.value;

    // 終点の小節番号
    let v2 = Math.min(Math.floor(v1) + 1, p2.value);

    while (true) {
      const measureIndex = Math.floor(v1);

      const bezierDivision = Math.max(
        Math.floor(measures[measureIndex].height / 20),
        10
      );

      for (let i2 = 0; i2 < bezierDivision; i2++) {
        lines.push({
          ...GetLineInfoFromPool(
            measures[measureIndex],
            toLinePointInfo(
              measureIndex,
              v1 + (1 / bezierDivision) * (v2 - v1) * i2
            ),
            toLinePointInfo(
              measureIndex,
              v1 + (1 / bezierDivision) * (v2 - v1) * (i2 + 1)
            )
          ),
          noteLine: noteLine,
        });
      }

      if (v2 >= p2.value) {
        break;
      }
      v1 = v2;
      v2 = Math.min(v2 + 1, p2.value);
    }
  }

  return lines;
}

type R = {
  currentPoint: Vector2;
  points: {
    point: Vector2;
    normalizedPoint: Vector2;
  }[];
};

export function getQuadraticBezierLines2(
  points: LinePoint[],
  noteLine: NoteLine,
  measures: Measure[]
): R {
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  const s = firstPoint.measureIndex + Fraction.to01(firstPoint.measurePosition);
  const e = lastPoint.measureIndex + Fraction.to01(lastPoint.measurePosition);

  const div = 10;

  function getPos(tX: number, t: number) {
    const p = s + (e - s) * t;

    const measureIndex = Math.floor(p);
    const measure = measures[measureIndex];

    const y = lerp(measure.y, measure.y + measure.height, 1 - (p % 1.0));

    const x = measure.x + measure.width * tX;

    return new Vector2(x, y);
  }

  const result: R = {
    currentPoint: getPos(noteLine.bezier.x, noteLine.bezier.y),
    points: [],
  };

  for (let x = 0; x < div + 1; x++) {
    for (let y = 0; y < div + 1; y++) {
      const normalizedX = (1 / div) * x;
      const normalizedY = (1 / div) * y;

      const pos = getPos(normalizedX, normalizedY);
      result.points.push({
        point: pos,
        normalizedPoint: new Vector2(normalizedX, normalizedY),
      });
    }
  }

  return result;
}
