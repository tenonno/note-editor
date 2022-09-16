import { NoteLine } from "../objects/NoteLine";
import { Measure } from "../objects/Measure";
import { Graphics, Rectangle } from "pixi.js";
import { Fraction, lerp, Vector2 } from "../math";
import { NoteLineInfo } from "../objects/Lane";
import { GetLineInfoFromPool } from "./pool";
import { LinePoint } from "../objects/LaneRenderer";
import { Note } from "../objects/Note";
import { LanePoint } from "../objects/LanePoint";
import { BezierNoteLineCalculator } from "./bezierNoteLineCalculator";

export function noteToLanePoint(
  note: Note,
  noteBounds: Rectangle,
  measures: Measure[]
) {
  return {
    horizontalSize: noteBounds.width,
    horizontalPosition: new Fraction(
      noteBounds.x - measures[note.measureIndex].x,
      measures[note.measureIndex].width
    ),
    measureIndex: note.measureIndex,
    measurePosition: Fraction.clone(note.measurePosition),
  } as LanePoint;
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

  const bezierNoteLineCalculator = new BezierNoteLineCalculator(
    noteLine,
    points[0],
    points[1],
    measures
  );

  if (debugGraphics) {
    bezierNoteLineCalculator.debug(debugGraphics);
  }

  const p1 = bezierNoteLineCalculator.headPoint;
  const p2 = bezierNoteLineCalculator.tailPoint;

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
          bezierNoteLineCalculator.getLinePointInfo(
            measureIndex,
            v1 + (1 / bezierDivision) * (v2 - v1) * i2
          ),
          bezierNoteLineCalculator.getLinePointInfo(
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
