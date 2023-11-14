import { Measure } from "./Measure";
import * as PIXI from "pixi.js";

export interface IMeasureRenderer {
  render(graphics: PIXI.Graphics, measure: Measure, measures: Measure[]): void;
}

/**
 * デフォルトの小節レンダラー
 */
class MeasureDefaultRenderer implements IMeasureRenderer {
  render(graphics: PIXI.Graphics, measure: Measure, measures: Measure[]) {
    const { x, y, width, height } = measure;

    graphics
      .lineStyle(2, 0xffffff)
      .beginFill(0x333333)
      .drawRect(x, y, width, height)
      .endFill();

    if (measure.invisibleLine) {
      graphics
        .lineStyle(2, 0x333333)
        .moveTo(x, y + height)
        .lineTo(x + width, y + height);
    }
  }
}

export default new MeasureDefaultRenderer() as IMeasureRenderer;
