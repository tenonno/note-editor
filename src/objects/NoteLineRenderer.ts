import Pixi from "../containers/Pixi";
import { approximately, isInSquare } from "../math";
import Vector2 from "../math/Vector2";
import { drawQuad } from "../utils/drawQuad";
import { LineInfo, NoteLineInfo } from "./Lane";
import { LanePoint } from "./LanePoint";
import { Note } from "./Note";
import { NoteLine } from "./NoteLine";
import { createNoteLineCalculator, getLanePoints, getLines } from "../utils/noteLineUtility";
import { Graphics } from "pixi.js";

type NoteLineRenderResult = {
  isSuccess: boolean;
  noteLineInfos: NoteLineInfo[];
  lanePoints: LanePoint[];
};

export interface INoteLineRenderer {
  customRender(
    graphics: Graphics,
    lines: LineInfo[],
    head: Note,
    tail: Note
  ): void;

  renderByNote(
    head: Note,
    tail: Note,
    noteLine: NoteLine,
    graphics: Graphics
  ): NoteLineRenderResult;

  render(
    noteLine: NoteLine,
    graphics: Graphics,
    notes: Note[]
  ): NoteLineRenderResult;
}

class NoteLineRenderer implements INoteLineRenderer {
  customRender(graphics: Graphics, lines: LineInfo[], head: Note, tail: Note) {
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
    graphics: Graphics
  ): NoteLineRenderResult {
    const result: NoteLineRenderResult = {
      isSuccess: false,
      noteLineInfos: [],
      lanePoints: [],
    };

    if (!head.isVisible && !tail.isVisible) {
      return result;
    }

    const chart = Pixi.instance!.injected.editor!.currentChart!;

    result.lanePoints = getLanePoints(noteLine, chart);

    const calculator = createNoteLineCalculator(noteLine, result.lanePoints, chart.timeline.measures);
    result.noteLineInfos = getLines(calculator, noteLine, chart.timeline.measures)

    this.customRender(graphics, result.noteLineInfos, head, tail);

    result.isSuccess = true;
    return result;
  }

  public render(
    noteLine: NoteLine,
    graphics: Graphics,
    notes: Note[]
  ): NoteLineRenderResult {
    const { noteMap } = Pixi.instance!.injected.editor!.currentChart!.timeline;

    const head = noteMap.get(noteLine.head)!;
    const tail = noteMap.get(noteLine.tail)!;

    return this.renderByNote(head, tail, noteLine, graphics);
  }
}

export class NoteLineRenderInfo {
  public constructor(private infos: NoteLineInfo[]) { }

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
        isInSquare(
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
