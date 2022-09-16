import { Graphics } from "pixi.js";
import Pixi from "../containers/Pixi";
import MeasureRendererResolver from "../objects/MeasureRendererResolver";
import Chart from "../stores/Chart";
import EditorSetting, { EditMode, ObjectCategory } from "../stores/EditorSetting";
import { Fraction } from "../math";
import Editor from "../stores/EditorStore";
import { Measure } from "./Measure";
import TimelineObject from "./TimelineObject";
import MouseInfo from "../utils/mouseInfo";

type UpdateResult = {
  targetMeasure: Measure | null;
  targetMeasureDivision: number;
  selectTargets: TimelineObject[] | null;
};

export default class MeasureController {
  public constructor(private graphics: Graphics, private editor: Editor) {}

  public updateTime(chart: Chart, currentTime: number): void {
    const timeCalculator = chart.timeline.timeCalculator;

    const measureTimes = Array.from(
      { length: chart.timeline.measures.length + 1 },
      (_, i) => timeCalculator.getTime(i)
    );

    for (const measure of chart.timeline.measures) {
      // 小節の開始時刻、終了時刻
      measure.beginTime = measureTimes[measure.index];
      measure.endTime = measureTimes[measure.index + 1];
      measure.containsCurrentTime = false;

      // 小節の中に現在時刻があるなら
      if (measure.beginTime <= currentTime && currentTime < measure.endTime) {
        // 位置を二分探索
        let min = 0,
          max = 1,
          pos = 0.5;
        while ((max - min) * measure.height > 1) {
          if (currentTime < timeCalculator.getTime(measure.index + pos)) {
            max = pos;
          } else {
            min = pos;
          }
          pos = (min + max) / 2;
        }

        measure.containsCurrentTime = true;
        measure.currentTimePosition = pos;
      }
    }
  }

  public render(
    chart: Chart,
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
      const { x, y } = measure;

      const hh = measure.height;

      const measureIndexTextWidth = 20;

      // 画面内なら小節を描画する
      if (measure.isVisible) {
        MeasureRendererResolver.resolve().render(
          this.graphics,
          measure,
          chart.timeline.measures
        );

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

      // 小節の中に現在時刻があるなら
      if (measure.containsCurrentTime) {
        const $y = y + hh - hh * measure.currentTimePosition;

        cx = x + measureWidth / 2;
        cy = measureLayout.getScrollOffsetY(
          $y,
          measure,
          chart.timeline.measures
        );

        this.graphics
          .lineStyle(4, 0xff0000)
          .moveTo(x, $y)
          .lineTo(x + measureWidth, $y);
      }
    }

    return {
      x: cx,
      y: cy,
    };
  }

  public update(
    chart: Chart,
    canEdit: boolean,
    mouseInfo: MouseInfo
  ): UpdateResult {
    const { setting } = this.editor;
    const { theme, measureWidth } = setting;

    const { isClick } = mouseInfo;
    const mousePosition = mouseInfo.position;

    // カーソルを合わせている小節
    const targetMeasure =
      chart.timeline.measures.find((measure) =>
        measure.containsPoint(mousePosition)
      ) ?? null;
    const measureDivision = this.editor.setting.measureDivision;
    const targetMeasureDivision = !targetMeasure
      ? 1
      : measureDivision * Fraction.to01(targetMeasure.beat);

    let selectTargets = null;

    if (!targetMeasure || !canEdit) {
      return {
        targetMeasure,
        targetMeasureDivision,
        selectTargets,
      };
    }

    selectTargets = [targetMeasure];

    // ターゲット小節の分割線を描画
    const div = targetMeasureDivision;
    for (let i = 1; i < div; ++i) {
      const y = targetMeasure.y + (targetMeasure.height / div) * (div - i);
      this.graphics
        .lineStyle(2, 0xffffff, (4 * i) % measureDivision === 0 ? 1 : 0.6)
        .moveTo(targetMeasure.x, y)
        .lineTo(targetMeasure.x + measureWidth, y);
    }

    // レーン追加モードなら小節の横分割線を描画
    if (
      setting.editMode === EditMode.Add &&
      setting.editObjectCategory === ObjectCategory.Lane
    ) {
      for (let i = 1; i < chart.timeline.horizontalLaneDivision; ++i) {
        const x =
          targetMeasure.x +
          (measureWidth / chart.timeline.horizontalLaneDivision) * i;

        this.graphics
          .lineStyle(2, 0xffffff, 0.8)
          .moveTo(x, targetMeasure.y)
          .lineTo(x, targetMeasure.y + targetMeasure.height);
      }
    }

    return {
      targetMeasure,
      targetMeasureDivision,
      selectTargets,
    };
  }
}
