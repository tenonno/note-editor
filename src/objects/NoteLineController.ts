import Editor from "../stores/EditorStore";
import NoteLineRendererResolver from "./NoteLineRendererResolver";
import Chart from "../stores/Chart";
import Vector2 from "../math/Vector2";
import { NoteLineInfo } from "./Lane";
import { Measure } from "./Measure";
import { NoteLineRenderInfo } from "./NoteLineRenderer";
import TimelineObject from "./TimelineObject";
import MouseInfo from "../utils/mouseInfo";
import { Graphics } from "pixi.js";
import { BezierPointInfo } from "./BezierPointController";
import { CurveType } from "./NoteLine";

type UpdateResult = {
  selectTargets: TimelineObject[] | null;
  noteLineInfos: NoteLineInfo[];
  bezierPointInfos: BezierPointInfo[];
};

export default class NoteLineController {
  public constructor(private graphics: Graphics, private editor: Editor) { }

  public update(
    chart: Chart,
    mouseInfo: MouseInfo,
    measures: Measure[],
    targetMeasure: Measure | null,
    cancelRangeSelection: () => void
  ): UpdateResult {
    const ret: NoteLineInfo[] = [];
    let selectTargets = null;

    const bezierPointInfos: BezierPointInfo[] = [];

    const { noteMap } = chart.timeline;

    // ノートライン描画
    for (const noteLine of chart.timeline.noteLines) {
      const head = noteMap.get(noteLine.head)!;
      const tail = noteMap.get(noteLine.tail)!;

      const {
        isSuccess,
        noteLineInfos: lines,
        lanePoints,
      } = NoteLineRendererResolver.resolve(noteLine).renderByNote(
        head,
        tail,
        noteLine,
        this.graphics
      );

      if (isSuccess && noteLine.curve.type == CurveType.Bezier) {
        bezierPointInfos.push({
          noteLine,
          lanePoints,
          horizontalDivision: head.horizontalPosition.denominator,
        });
      }

      // ホバー判定
      if (targetMeasure) {
        const { isOverlap } = new NoteLineRenderInfo(lines).overlap(
          Vector2.from(mouseInfo.position),
          targetMeasure.index
        );
        if (isOverlap) {
          if (!selectTargets) {
            selectTargets = [noteLine];
          }

          if (mouseInfo.isRightClick) {
            this.editor.noteLineContextMenu.show(noteLine, chart);
          }
        }
      }

      noteLine.setRenderResult(lines);

      ret.push(...lines);
    }

    return {
      selectTargets,
      noteLineInfos: ret,
      bezierPointInfos,
    };
  }
}
