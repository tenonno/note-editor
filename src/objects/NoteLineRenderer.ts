import * as PIXI from "pixi.js";
import Pixi from "../containers/Pixi";
import { approximately, Fraction } from "../math";
import Vector2 from "../math/Vector2";
import { drawQuad } from "../utils/drawQuad";
import { LineInfo, NoteLineInfo } from "./Lane";
import { LanePoint } from "./LanePoint";
import { getLines } from "./LaneRenderer";
import { sortMeasure, sortMeasureData } from "./Measure";
import { Note } from "./Note";
import { NoteLine } from "./NoteLine";
import { IsInSquare } from "./NoteLineController";
import { getQuadraticBezierLines } from "../utils/noteLineUtility";

type NoteLineRenderResult = {
  isSuccess: boolean;
  noteLineInfos: NoteLineInfo[];
  lanePoints: LanePoint[];
};

export interface INoteLineRenderer {
  customRender(
    graphics: PIXI.Graphics,
    lines: LineInfo[],
    head: Note,
    tail: Note
  ): void;

  renderByNote(
    head: Note,
    tail: Note,
    noteLine: NoteLine,
    graphics: PIXI.Graphics
  ): NoteLineRenderResult;

  render(
    noteLine: NoteLine,
    graphics: PIXI.Graphics,
    notes: Note[]
  ): NoteLineRenderResult;
}

class NoteLineRenderer implements INoteLineRenderer {
  customRender(
    graphics: PIXI.Graphics,
    lines: LineInfo[],
    head: Note,
    tail: Note
  ) {
    for (const line of lines) {
      drawQuad(
        graphics,
        line.start.point,
        Vector2.add(line.start.point, new Vector2(line.start.width, 0)),
        Vector2.add(line.end.point, new Vector2(line.end.width, 0)),
        line.end.point,
        head.color
      );

      // 左右の線
      graphics
        .lineStyle(1, head.color, 1)
        .moveTo(line.start.point.x, line.start.point.y)
        .lineTo(line.end.point.x, line.end.point.y);
      graphics
        .lineStyle(1, head.color, 1)
        .moveTo(line.start.point.x + line.start.width, line.start.point.y)
        .lineTo(line.end.point.x + line.end.width, line.end.point.y);
    }
  }

  public renderByNote(
    head: Note,
    tail: Note,
    noteLine: NoteLine,
    graphics: PIXI.Graphics
  ): NoteLineRenderResult {
    const result: NoteLineRenderResult = {
      isSuccess: false,
      noteLineInfos: [],
      lanePoints: [],
    };

    if (!head.isVisible && !tail.isVisible) {
      return result;
    }

    const {
      lanePointMap,
      noteMap,
      laneMap,
      measures,
    } = Pixi.instance!.injected.editor!.currentChart!.timeline;

    // head, tail をソート
    [head, tail] = [head, tail].sort(sortMeasureData);

    const lane = laneMap.get(head.lane)!;

    if (!lane) console.error(laneMap, head);

    const headPos = head.measureIndex + Fraction.to01(head.measurePosition);
    const tailPos = tail.measureIndex + Fraction.to01(tail.measurePosition);

    const length = tailPos - headPos;

    if (!head.updateBounds()) return result;
    if (!tail.updateBounds()) return result;

    const headBounds = head.getBounds();
    const tailBounds = tail.getBounds();

    // 先頭ノートと末尾ノートの間にあるレーン中間ポイントを取得する
    // レーンの変形を行わない場合は使用しない
    let lps = lane.points
      .map((guid) => lanePointMap.get(guid)!)
      .filter((lp) => {
        const n = lp.measureIndex + Fraction.to01(lp.measurePosition);
        return n > headPos && n < tailPos;
      })
      .sort(sortMeasure)
      .map((lp) => {
        lp = lp.clone();

        const pos = lp.measureIndex + Fraction.to01(lp.measurePosition);
        const s = pos - headPos;

        // 現在の位置
        const pp = s / length;

        // 先頭ノートが配置してある位置のレーンの横幅
        const headNoteLaneWidth =
          (headBounds.width / head.horizontalSize) *
          head.horizontalPosition.denominator;

        // 末尾ノートが配置してある位置のレーンの横幅
        const tailNoteLaneWidth =
          (tailBounds.width / tail.horizontalSize) *
          tail.horizontalPosition.denominator;

        // 先頭ノートが配置してあるレーンの左座標
        const headNoteLaneLeft =
          headBounds.x -
          (headNoteLaneWidth / head.horizontalPosition.denominator) *
            head.horizontalPosition.numerator;

        // 末尾ノートが配置してあるレーンの左座標
        const tailNoteLaneLeft =
          tailBounds.x -
          (tailNoteLaneWidth / tail.horizontalPosition.denominator) *
            tail.horizontalPosition.numerator;

        const headLaneNormalizedHorizontalPos =
          (headBounds.x - headNoteLaneLeft) / headNoteLaneWidth;
        const tailLaneNormalizedHorizontalPos =
          (tailBounds.x - tailNoteLaneLeft) / tailNoteLaneWidth;

        const measureW = measures[lp.measureIndex].width;

        const curSize =
          headBounds.width + (tailBounds.width - headBounds.width) * pp;

        const s_pos =
          headLaneNormalizedHorizontalPos +
          (tailLaneNormalizedHorizontalPos - headLaneNormalizedHorizontalPos) *
            pp;

        // レーンの左
        const left =
          Fraction.to01(lp.horizontalPosition) * measureW +
          (measureW / lp.horizontalPosition.denominator) *
            lp.horizontalSize *
            s_pos;

        lp.horizontalSize = curSize;
        lp.horizontalPosition = new Fraction(left, measureW);
        return lp;
      });

    const noteToLanePoint = (note: Note, noteBounds: PIXI.Rectangle) => {
      return {
        horizontalSize: noteBounds.width,
        horizontalPosition: new Fraction(
          noteBounds.x - measures[note.measureIndex].x,
          measures[note.measureIndex].width
        ),
        measureIndex: note.measureIndex,
        measurePosition: Fraction.clone(note.measurePosition),
      } as LanePoint;
    };

    lps = [
      noteToLanePoint(head, headBounds),
      ...lps,
      noteToLanePoint(tail, tailBounds),
    ];

    result.lanePoints = lps;
    result.noteLineInfos = noteLine.bezier.enabled
      ? getQuadraticBezierLines(lps, noteLine, measures)
      : getLines(lps, measures).map((lineInfo) => ({ ...lineInfo, noteLine }));

    this.customRender(graphics, result.noteLineInfos, head, tail);

    result.isSuccess = true;
    return result;
  }

  public render(
    noteLine: NoteLine,
    graphics: PIXI.Graphics,
    notes: Note[]
  ): NoteLineRenderResult {
    const { noteMap } = Pixi.instance!.injected.editor!.currentChart!.timeline;

    const head = noteMap.get(noteLine.head)!;
    const tail = noteMap.get(noteLine.tail)!;

    return this.renderByNote(head, tail, noteLine, graphics);
  }
}

export class NoteLineRenderInfo {
  public constructor(private infos: NoteLineInfo[]) {}

  public overlap(
    pos: Vector2,
    targetMeasureIndex: number
  ): {
    isOverlap: boolean;
    targetNoteLine?: NoteLine;
    targetNoteLineInfo?: NoteLineInfo;
  } {
    for (const line of this.infos) {
      if (line.measure.index !== targetMeasureIndex) {
        continue;
      }

      // 始点と重なっている
      const isOverlapStartPoint =
        approximately(line.start.point.y, pos.y) &&
        line.start.point.x <= pos.x &&
        line.start.point.x + line.start.width >= pos.x;

      if (
        isOverlapStartPoint ||
        IsInSquare(
          line.start.point,
          line.end.point,
          Vector2.add(line.end.point, new Vector2(line.end.width, 0)),
          Vector2.add(line.start.point, new Vector2(line.start.width, 0)),
          pos
        )
      ) {
        return {
          isOverlap: true,
          targetNoteLine: line.noteLine,
          targetNoteLineInfo: line,
        };
      }
    }
    return { isOverlap: false };
  }
}

export default new NoteLineRenderer() as INoteLineRenderer;
