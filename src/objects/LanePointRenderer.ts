import { LanePoint } from "./LanePoint";
import { Measure } from "./Measure";
import { Graphics, Rectangle } from "pixi.js";

class LanePointRenderer {
  getBounds(lanePoint: LanePoint, measure: Measure): Rectangle {
    const w =
      (measure.width / lanePoint.horizontalPosition!.denominator) *
      lanePoint.horizontalSize;

    const x =
      measure.x +
      (measure.width / lanePoint.horizontalPosition!.denominator) *
        lanePoint.horizontalPosition!.numerator;

    const y =
      measure.y +
      measure.height -
      (measure.height / lanePoint.measurePosition!.denominator) *
        lanePoint.measurePosition!.numerator;

    const colliderH = 20;

    const _x = x;
    const _y = y - colliderH / 2;

    return new Rectangle(_x, _y, w, colliderH);
  }

  render(lanePoint: LanePoint, graphics: Graphics, measure: Measure) {
    const bounds = this.getBounds(lanePoint, measure);

    graphics
      .lineStyle(4, lanePoint.color, 1)
      .moveTo(bounds.x, bounds.y + bounds.height / 2)
      .lineTo(bounds.x + bounds.width, bounds.y + bounds.height / 2);
  }
}

export default new LanePointRenderer();
