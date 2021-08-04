import { Graphics } from "pixi.js";
import Pixi from "../containers/Pixi";
import MeasureRendererResolver from "../objects/MeasureRendererResolver";
import Chart from "../stores/Chart";
import EditorSetting from "../stores/EditorSetting";

export default class MeasureController {
  public render(
    chart: Chart,
    graphics: Graphics,
    pixi: Pixi,
    setting: EditorSetting
  ): {
    x: number;
    y: number;
  } {
    const { measureWidth, measureLayout, horizontalPadding } = setting;

    // 判定ラインの x 座標
    let cx = 0;

    // 0 ~ 1 に正規化された判定ラインの y 座標
    let cy = 0;

    // 小節の操作
    for (const measure of chart.timeline.measures) {
      const x = measure.x;
      const y = measure.y;
      const hh = measure.height;

      const measureIndexTextWidth = 20;

      // 画面内なら小節を描画する
      if (measure.isVisible) {
        MeasureRendererResolver.resolve().render(
          graphics,
          measure,
          chart.timeline.measures
        );
      }

      // 小節の中に現在時刻があるなら
      if (measure.containsCurrentTime) {
        const $y = y + hh - hh * measure.currentTimePosition;

        cx = x + measureWidth / 2;
        cy = measureLayout.getScrollOffsetY(
          $y,
          measure,
          chart.timeline.measures
        );

        graphics
          .lineStyle(4, 0xff0000)
          .moveTo(x, $y)
          .lineTo(x + measureWidth, $y);
      }

      if (measure.isVisible) {
        // 小節番号
        pixi.drawText(
          measure.index.toString().padStart(3, "0"),
          x - measureIndexTextWidth, // - padding / 2,
          y + hh - 10,
          { fontSize: 20 },
          horizontalPadding
        );
        // 特殊な拍子なら表示する
        if (measure.beat.numerator !== measure.beat.denominator) {
          pixi.drawText(
            `${measure.beat.numerator}/${measure.beat.denominator}`,
            x - measureIndexTextWidth,
            y + hh - 30,
            { fontSize: 20, fill: 0xcccccc },
            horizontalPadding
          );
        }
      }
    }
    return {
      x: cx,
      y: cy,
    };
  }
}
