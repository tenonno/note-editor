import Editor from "../stores/EditorStore";
import Vector2 from "../math/Vector2";
import { Measure } from "./Measure";
import { getBezierPointInfo } from "../utils/noteLineUtility";
import { NoteLine } from "./NoteLine";
import { minBy } from "lodash";
import { LanePoint } from "./LanePoint";
import MouseInfo from "../utils/mouseInfo";
import { Graphics } from "pixi.js";

type UpdateResult = { isHover: boolean; isDragging: boolean };

export type BezierPointInfo = {
  noteLine: NoteLine;
  lanePoints: LanePoint[];
  horizontalDivision: number;
};

export default class BezierPointController {
  private bezierDrag: {
    isDragging: boolean;
    noteLine: NoteLine | null;
  } = {
    isDragging: false,
    noteLine: null,
  };

  public constructor(private graphics: Graphics, private editor: Editor) {}

  public update(
    infos: BezierPointInfo[],
    measures: Measure[],
    mouseInfo: MouseInfo,
    setCursor: (value: string) => void,
    cancelRangeSelection: () => void
  ): UpdateResult {
    if (this.bezierDrag.isDragging && !mouseInfo.isLeftPressed) {
      this.bezierDrag.isDragging = false;
    }

    let isHover = false;
    for (const info of infos) {
      const { isHover: currentIsHover } = this.updateBezier(
        info,
        measures,
        mouseInfo,
        cancelRangeSelection
      );
      if (currentIsHover) {
        isHover = true;
      }
    }

    if (isHover || this.bezierDrag.isDragging) {
      setCursor("move");
    }

    return { isHover, isDragging: this.bezierDrag.isDragging };
  }

  private updateBezier(
    info: BezierPointInfo,
    measures: Measure[],
    mouseInfo: MouseInfo,
    cancelRangeSelection: () => void
  ) {
    const { noteLine, lanePoints, horizontalDivision } = info;

    const { currentPoint, points } = getBezierPointInfo(
      lanePoints,
      noteLine,
      measures,
      horizontalDivision,
      this.editor.setting.measureDivision
    );

    const isHover =
      currentPoint.distanceTo(Vector2.from(mouseInfo.position)) <= 8.0;

    this.graphics
      .lineStyle(1, 0x00cccc)
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

      const nn = minBy(points, (point) =>
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
}
