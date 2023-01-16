import { CurveType, NoteLine } from "../objects/NoteLine";
import { Measure, sortMeasure } from "../objects/Measure";
import { Rectangle } from "pixi.js";
import { Fraction, inverseLerp, lerp, Vector2 } from "../math";
import { LinePointInfo, NoteLineInfo } from "../objects/Lane";
import { GetLineInfoFromPool } from "./pool";
import { LinePoint } from "../objects/LaneRenderer";
import { Note } from "../objects/Note";
import { LanePoint } from "../objects/LanePoint";
import { BezierNoteLineCalculator } from "./bezierNoteLineCalculator";
import { EaseNoteLineCalculator } from "./EaseNoteLineCalculator";
import Chart from "src/stores/Chart";

export interface INoteLineCalculator {
  headPoint: { value: number },
  tailPoint: { value: number },
  // 値を点に変換
  getLinePointInfo(measureIndex: number, value: number): LinePointInfo
}

export function getLanePoints(noteLine: NoteLine, chart: Chart) {
  return [noteLine.head, noteLine.tail].map(guid => {
    const note = chart.timeline.noteMap.get(guid)!;
    note.updateBounds();
    return noteToLanePoint(note,
      note.getBounds(),
      chart.timeline.measures
    )
  }).sort(sortMeasure);
}

export function createNoteLineCalculator(noteLine: NoteLine, points: LinePoint[], measures: Measure[]) {
  return noteLine.curve.type == CurveType.Bezier
    ? new BezierNoteLineCalculator(noteLine, points, measures)
    : new EaseNoteLineCalculator(noteLine, points, measures);
}

function noteToLanePoint(
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

export function getLines(
  noteLineCalculator: INoteLineCalculator,
  noteLine: NoteLine,
  measures: Measure[],
): NoteLineInfo[] {
  const lines: NoteLineInfo[] = [];

  const p1 = noteLineCalculator.headPoint;
  const p2 = noteLineCalculator.tailPoint;

  // 始点の小節番号
  let v1 = p1.value;

  // 終点の小節番号
  let v2 = Math.min(Math.floor(v1) + 1, p2.value);

  while (true) {
    const measureIndex = Math.floor(v1);

    const division = noteLine.curve.type == CurveType.None ? 1 : Math.max(
      Math.floor(measures[measureIndex].height / 20),
      10
    );

    for (let i2 = 0; i2 < division; i2++) {
      lines.push({
        ...GetLineInfoFromPool(
          measures[measureIndex],
          noteLineCalculator.getLinePointInfo(
            measureIndex,
            v1 + (1 / division) * (v2 - v1) * i2
          ),
          noteLineCalculator.getLinePointInfo(
            measureIndex,
            v1 + (1 / division) * (v2 - v1) * (i2 + 1)
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

export function getBezierPointInfo(
  points: LinePoint[],
  noteLine: NoteLine,
  measures: Measure[],
  horizontalDivision: number,
  measureDivision: number
): R {
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  const s = firstPoint.measureIndex + Fraction.to01(firstPoint.measurePosition);
  const e = lastPoint.measureIndex + Fraction.to01(lastPoint.measurePosition);

  const divX = horizontalDivision;

  function getPointByNormalizedPoint(tX: number, t: number) {
    const p = s + (e - s) * t;

    const measureIndex = Math.floor(p);
    const measure = measures[measureIndex];

    const y = lerp(measure.y, measure.y + measure.height, 1 - (p % 1.0));

    const x = measure.x + measure.width * tX;

    return new Vector2(x, y);
  }

  function getPos(tX: number, t: number, measureIndex: number) {
    const measure = measures[measureIndex];
    const y = lerp(measure.y, measure.y + measure.height, 1 - (t % 1.0));
    const x = measure.x + measure.width * tX;
    return new Vector2(x, y);
  }

  const result: R = {
    currentPoint: getPointByNormalizedPoint(
      noteLine.curve.x,
      noteLine.curve.y
    ),
    points: [],
  };

  for (let x = 0; x < divX + 1; x++) {
    const normalizedX = (1 / divX) * x;

    for (
      let measureIndex = firstPoint.measureIndex;
      measureIndex < lastPoint.measureIndex + 1;
      measureIndex++
    ) {
      for (let y = 0; y < measureDivision; y++) {
        const position = measureIndex + (1 / measureDivision) * y;

        if (position >= s && position <= e) {
          const pos = getPos(normalizedX, position, measureIndex);

          const normalizedY = inverseLerp(s, e, position);

          result.points.push({
            point: pos,
            normalizedPoint: new Vector2(normalizedX, normalizedY),
          });
        }
      }
    }
  }

  return result;
}
