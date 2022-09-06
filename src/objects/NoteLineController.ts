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

// 衝突判定系の汎用処理クラス
// 指定した4点の中にpがあるかどうかを判定する
// 但し、4つそれぞれの内角のいずれかが180度以上の場合、正しく判定できない。
export function IsInSquare(
  pa: Vector2,
  pb: Vector2,
  pc: Vector2,
  pd: Vector2,
  p: Vector2
) {
  const a = CalcExteriorProduct(pa, pb, p);

  // if (a <= 0) return false;

  const b = CalcExteriorProduct(pb, pc, p);
  const c = CalcExteriorProduct(pc, pd, p);
  const d = CalcExteriorProduct(pd, pa, p);

  return a > 0 && b > 0 && c > 0 && d > 0;
}

// 指定した2点間と1点の外積を計算する
function CalcExteriorProduct(a: Vector2, b: Vector2, p: Vector2) {
  // 点 a,b のベクトル
  var vecab = new Vector2(a.x - b.x, a.y - b.y); // ここは固定なら最初から計算しておくのもアリかも
  // 点a と 点のベクトル
  var vecpa = new Vector2(a.x - p.x, a.y - p.y);
  // 外積を計算する
  var ext = vecab.x * vecpa.y - vecpa.x * vecab.y;

  return ext;
}

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
    mouseInfo: MouseInfo
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
    targetMeasure: Measure | null
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
          mouseInfo
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
