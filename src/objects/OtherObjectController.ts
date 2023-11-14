import * as PIXI from "pixi.js";
import { EditMode, ObjectCategory } from "../stores/EditorSetting";
import { Measure } from "./Measure";
import { guid } from "../utils/guid";
import Chart from "../stores/Chart";
import Editor from "../stores/EditorStore";
import { Fraction } from "../math";
import { OtherObjectRenderer } from "./OtherObjectRenderer";
import { OtherObject, OtherObjectRecord } from "./OtherObject";
import * as _ from "lodash";
import TimelineObject from "./TimelineObject";
import Vector2 from "../math/Vector2";
import MouseInfo from "../utils/mouseInfo";

type UpdateResult = {
  selectTargets: TimelineObject[] | null;
};

export default class OtherObjectController {
  private selectOtherObjectOrderIndex = 0;

  public constructor(
    private graphics: PIXI.Graphics,
    private editor: Editor,
    container: HTMLDivElement
  ) {
    container.addEventListener(
      "mouseup",
      () => {
        if (this.dragTargetNote) {
          editor.currentChart?.save();
        }

        this.dragTargetNote = null;
      },
      false
    );
  }

  public update(
    chart: Chart,
    canEdit: boolean,
    mouseInfo: MouseInfo,
    targetMeasure: Measure | null,
    targetMeasureDivision: number,
    setCursor: (value: string) => void,
    cancelRangeSelection: () => void
  ): UpdateResult {
    const { setting } = this.editor;
    const { theme } = setting;

    // 可視レイヤーの GUID
    const visibleLayers = new Set(
      chart.layers.filter((layer) => layer.visible).map((layer) => layer.guid)
    );

    let result: UpdateResult = {
      selectTargets: null,
    };

    // その他オブジェクト描画
    OtherObjectRenderer.updateFrame();
    for (const object of chart.timeline.otherObjects) {
      const measure = chart.timeline.measures[object.measureIndex];

      const isVisible = measure.isVisible && visibleLayers.has(object.layer);
      if (!isVisible) {
        continue;
      }

      OtherObjectRenderer.render(
        chart.musicGameSystem.otherObjectTypes,
        object,
        this.graphics,
        measure
      );

      if (this.editor.inspectorTargets.includes(object)) {
        OtherObjectRenderer.drawBounds(
          object,
          measure,
          this.graphics,
          theme.selected
        );
      }
    }

    if (!canEdit) {
      return result;
    }

    // 配置
    if (
      targetMeasure &&
      setting.editMode === EditMode.Add &&
      setting.editObjectCategory === ObjectCategory.Other
    ) {
      this.add(chart, targetMeasure, targetMeasureDivision, mouseInfo);
    }

    // その他オブジェクト選択/削除
    if (
      setting.editMode === EditMode.Select ||
      setting.editMode === EditMode.Delete
    ) {
      this.selectOrDelete(
        chart,
        mouseInfo,
        result,
        setCursor,
        cancelRangeSelection
      );
    }

    if (targetMeasure) {
      this.dragAndResize(mouseInfo, targetMeasure, targetMeasureDivision);
    }

    return result;
  }

  private dragTargetNote: OtherObject | null = null;
  private dragTargetNotePressPositionDiff: Vector2 | null = null;

  private selectOrDelete(
    chart: Chart,
    mouseInfo: MouseInfo,
    result: UpdateResult,
    setCursor: (value: string) => void,
    cancelRangeSelection: () => void
  ) {
    const { setting } = this.editor;
    const { isClick, isLeftPressing } = mouseInfo;
    const mousePosition = mouseInfo.position;

    const selectObjectOptions: {
      object: OtherObject;
      order: number;
    }[] = [];

    for (const object of chart.timeline.otherObjects) {
      const bounds = OtherObjectRenderer.getBounds(
        object,
        chart.timeline.measures[object.measureIndex]
      );

      let canDrag = false;

      if (bounds.contains(mousePosition.x, mousePosition.y)) {
        const measure = chart.timeline.measures[object.measureIndex];

        const renderOrder = OtherObjectRenderer.getRenderOrder(object, measure);

        selectObjectOptions.push({ object, order: renderOrder });

        canDrag = true;
        setCursor("move");

        // ドラッグ判定
        if (isLeftPressing && canDrag) {
          this.dragTargetNote = object;
          this.dragTargetNotePressPositionDiff = new Vector2(
            bounds.x - mousePosition.x,
            bounds.y - mousePosition.y
          );
          cancelRangeSelection();
        }
      }
    }

    if (selectObjectOptions.length === 0) {
      return;
    }

    const selectObject = _.orderBy(selectObjectOptions, "order")[
      this.selectOtherObjectOrderIndex % selectObjectOptions.length
    ].object;

    result.selectTargets = [selectObject];

    if (isClick) {
      if (setting.editMode === EditMode.Select) {
        this.selectOtherObjectOrderIndex++;
      } else if (setting.editMode === EditMode.Delete) {
        chart.timeline.removeOtherObject(selectObject);
        chart.save();
      }
    }
  }

  private dragAndResize(
    mouseInfo: MouseInfo,
    targetMeasure: Measure,
    targetMeasureDivision: number
  ) {
    const { setting } = this.editor;

    const {
      measureIndex,
      measurePosition,
    } = OtherObjectController.getAddPosition(
      mouseInfo,
      targetMeasure,
      targetMeasureDivision
    );

    // ノートのドラッグ
    if (this.dragTargetNote && setting.editMode === EditMode.Select) {
      this.dragTargetNote.measureIndex = measureIndex;
      this.dragTargetNote.measurePosition = measurePosition;
    }
  }

  private static getAddPosition(
    mouseInfo: MouseInfo,
    targetMeasure: Measure,
    targetMeasureDivision: number
  ): {
    measureIndex: number;
    measurePosition: Fraction;
  } {
    const mousePosition = mouseInfo.position;

    function normalizeContainsPoint(measure: Measure, point: PIXI.Point) {
      return [
        (point.x - measure.x) / measure.width,
        (point.y - measure.y) / measure.height,
      ];
    }

    const [, ny] = normalizeContainsPoint(targetMeasure, mousePosition);

    const vlDiv = targetMeasureDivision;

    const numerator = vlDiv - _.clamp(Math.round(ny * vlDiv), 0, vlDiv);

    if (numerator === vlDiv) {
      return {
        measureIndex: targetMeasure.index + 1,
        measurePosition: new Fraction(0, vlDiv),
      };
    }

    return {
      measureIndex: targetMeasure.index,
      measurePosition: new Fraction(numerator, vlDiv),
    };
  }

  /**
   * その他オブジェクト配置
   */
  private add(
    chart: Chart,
    targetMeasure: Measure,
    targetMeasureDivision: number,
    mouseInfo: MouseInfo
  ): void {
    const { setting } = this.editor;
    const { isClick } = mouseInfo;

    const {
      measureIndex: newMeasureIndex,
      measurePosition: newMeasurePosition,
    } = OtherObjectController.getAddPosition(
      mouseInfo,
      targetMeasure,
      targetMeasureDivision
    );

    const newObject = OtherObjectRecord.createInstance(
      {
        type: setting.editOtherTypeIndex,
        // @ts-ignore
        typeName:
          chart.musicGameSystem.otherObjectTypes[setting.editOtherTypeIndex]
            .name,
        measureIndex: newMeasureIndex,
        measurePosition: newMeasurePosition,
        guid: guid(),
        value: setting.otherValues.get(
          chart.musicGameSystem.otherObjectTypes[setting.editOtherTypeIndex]
            .name
        )!,
        layer: chart.currentLayer.guid,
      },
      chart
    );

    if (isClick) {
      chart.timeline.addOtherObject(newObject);
      chart.save();
    } else {
      // プレビュー
      OtherObjectRenderer.render(
        chart.musicGameSystem.otherObjectTypes,
        newObject,
        this.graphics,
        chart.timeline.measures[newObject.measureIndex]
      );
    }
  }
}
