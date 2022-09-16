import Editor from "../stores/EditorStore";
import NoteLineRendererResolver from "./NoteLineRendererResolver";
import Chart from "../stores/Chart";
import Vector2 from "../math/Vector2";
import { NoteLineInfo } from "./Lane";
import { Measure } from "./Measure";
import { NoteLineRenderInfo } from "./NoteLineRenderer";
import TimelineObject from "./TimelineObject";
import { getQuadraticBezierLines2 } from "../utils/noteLineUtility";
import { NoteLine } from "./NoteLine";
import { minBy } from "lodash";
import { LanePoint } from "./LanePoint";
import MouseInfo from "../utils/mouseInfo";
import { Graphics } from "pixi.js";

type UpdateResult = {
  selectTargets: TimelineObject[] | null;
  noteLineInfos: NoteLineInfo[];
};

export default class NoteLineController {
  private isBezierPointDragging = false;

  private bezierDrag: {
    isDragging: boolean;
    noteLine: NoteLine | null;
  } = {
    isDragging: false,
    noteLine: null,
  };

  public constructor(private graphics: Graphics, private editor: Editor) {}

  private updateBezier(
    noteLine: NoteLine,
    lanePoints: LanePoint[],
    measures: Measure[],
    mouseInfo: MouseInfo,
    cancelRangeSelection: () => void
  ) {
    const { currentPoint, points } = getQuadraticBezierLines2(
      lanePoints,
      noteLine,
      measures
    );

    const isHover =
      currentPoint.distanceTo(Vector2.from(mouseInfo.position)) <= 8.0;

    this.graphics
      .lineStyle(0)
      .beginFill(0xffffff)
      .drawCircle(currentPoint.x, currentPoint.y, isHover ? 8 : 4)
      .endFill();

    // ホバー
    if (isHover) {
      if (mouseInfo.isLeftPressing) {
        this.bezierDrag.isDragging = true;
        this.bezierDrag.noteLine = noteLine;
      }
    }

    if (this.bezierDrag.isDragging && this.bezierDrag.noteLine === noteLine) {
      cancelRangeSelection();

      this.graphics
        .beginFill(0xffffff)
        .drawCircle(currentPoint.x, currentPoint.y, 12)
        .endFill();

      var nn = minBy(points, (point) =>
        point.point.distanceToSquared(Vector2.from(mouseInfo.position))
      )!.normalizedPoint;

      noteLine.bezier.x = nn.x;
      noteLine.bezier.y = nn.y;

      for (const { point } of points) {
        this.graphics
          .lineStyle(0)
          .beginFill(0xffffff)
          .drawCircle(point.x, point.y, 2)
          .endFill();
      }
    }

    return { isHover };
  }

  public update(
    chart: Chart,
    mouseInfo: MouseInfo,
    measures: Measure[],
    targetMeasure: Measure | null,
    cancelRangeSelection: () => void
  ): UpdateResult {
    const ret: NoteLineInfo[] = [];
    let selectTargets = null;

    if (this.bezierDrag.isDragging && !mouseInfo.isLeftPressed) {
      this.bezierDrag.isDragging = false;
    }

    let isHoverBezier = false;

    // ノートライン描画
    for (const noteLine of chart.timeline.noteLines) {
      const {
        isSuccess,
        noteLineInfos: lines,
        lanePoints,
      } = NoteLineRendererResolver.resolve(noteLine).render(
        noteLine,
        this.graphics,
        chart.timeline.notes
      );

      if (isSuccess && noteLine.bezier.enabled) {
        const { isHover } = this.updateBezier(
          noteLine,
          lanePoints,
          measures,
          mouseInfo,
          cancelRangeSelection
        );
        if (isHover) {
          isHoverBezier = true;
        }
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

    // ベジエ制御点にカーソルが合っているなら選択対象にする
    if (isHoverBezier) {
      selectTargets = [];
    }

    return {
      selectTargets,
      noteLineInfos: ret,
    };
  }
}
