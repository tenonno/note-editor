import * as PIXI from "pixi.js";
import { EditMode, ObjectCategory } from "../stores/EditorSetting";
import Vector2 from "../math/Vector2";
import { Measure } from "./Measure";
import Chart from "../stores/Chart";
import Editor from "../stores/EditorStore";
import LaneRendererResolver from "./LaneRendererResolver";
import LanePointRenderer from "./LanePointRenderer";
import { guid } from "../utils/guid";
import { Lane } from "./Lane";
import { Fraction } from "../math";
import * as _ from "lodash";
import { LanePoint } from "./LanePoint";
import { NotePointInfo } from "./LaneRenderer";
import MouseInfo from "../utils/mouseInfo";

type UpdateResult = {
  targetNotePoint: NotePointInfo | null;
};

export default class LaneController {
  private connectTargetLanePoint: LanePoint | null = null;

  public constructor(private graphics: PIXI.Graphics, private editor: Editor) { }

  public update(
    chart: Chart,
    canEdit: boolean,
    mouseInfo: MouseInfo,
    targetMeasure: Measure | null,
    targetNextMeasure: Measure | null,
    targetMeasureDivision: number
  ): UpdateResult {
    const { setting } = this.editor;
    const { isClick } = mouseInfo;
    const mousePosition = mouseInfo.position;

    const newNoteType =
      chart.musicGameSystem.noteTypes[setting.editNoteTypeIndex];

    let targetNotePoint: NotePointInfo | null = null;

    // レーン描画
    for (const lane of chart.timeline.lanes) {
      const laneRenderer = LaneRendererResolver.resolve(lane);

      laneRenderer.render(
        lane,
        this.graphics,
        chart.timeline.lanePointMap,
        chart.timeline.measures,
        targetMeasure || null,
        newNoteType
      );

      // ノート配置モードなら選択中のレーンを計算する
      if (
        !(
          canEdit &&
          setting.editMode === EditMode.Add &&
          setting.editObjectCategory === ObjectCategory.Note
        ) ||
        !targetMeasure ||
        targetNotePoint
      ) {
        continue;
      }

      // 配置できないレーンならやめる
      if ((newNoteType.excludeLanes || []).includes(lane.templateName)) {
        continue;
      }

      targetNotePoint = laneRenderer.getNotePointInfoFromMousePosition(
        lane,
        targetMeasure!,
        targetNextMeasure!,
        targetMeasureDivision,
        new Vector2(mousePosition.x, mousePosition.y)
      );
    }

    // 接続モード && レーン編集
    if (
      canEdit &&
      targetMeasure &&
      setting.editMode === EditMode.Connect &&
      setting.editObjectCategory === ObjectCategory.Lane
    ) {
      for (const lanePoint of chart.timeline.lanePoints) {
        if (
          LanePointRenderer.getBounds(
            lanePoint,
            chart.timeline.measures[lanePoint.measureIndex]
          ).contains(mousePosition.x, mousePosition.y)
        ) {
          const laneTemplate = chart.musicGameSystem.laneTemplateMap.get(
            lanePoint.templateName
          )!;

          // レーン接続プレビュー
          if (
            this.connectTargetLanePoint &&
            // 同じレーンポイントではない
            this.connectTargetLanePoint !== lanePoint &&
            this.connectTargetLanePoint.templateName === lanePoint.templateName
          ) {
            const newLane = {
              guid: guid(),
              templateName: laneTemplate.name,
              division: laneTemplate.division,
              points: [this.connectTargetLanePoint.guid, lanePoint.guid],
            } as Lane;

            LaneRendererResolver.resolve(newLane).render(
              newLane,
              this.graphics,
              chart.timeline.lanePointMap,
              chart.timeline.measures,
              null,
              newNoteType
            );

            if (isClick) {
              chart.timeline.addLane(newLane);
              chart.timeline.optimizeLane();
            }
          }

          if (isClick) {
            this.connectTargetLanePoint = lanePoint;
          }
        }
      }
    }

    // レーン配置
    if (
      canEdit &&
      targetMeasure &&
      setting.editMode === EditMode.Add &&
      setting.editObjectCategory === ObjectCategory.Lane
    ) {
      this.add(chart, mouseInfo, targetMeasure, targetMeasureDivision);
    }

    return { targetNotePoint };
  }

  /**
   * 配置
   */
  private add(
    chart: Chart,
    mouseInfo: MouseInfo,
    targetMeasure: Measure,
    targetMeasureDivision: number
  ): void {
    const { setting } = this.editor;
    const { isClick } = mouseInfo;
    const mousePosition = mouseInfo.position;

    function normalizeContainsPoint(measure: Measure, point: PIXI.Point) {
      return [
        (point.x - measure.x) / measure.width,
        (point.y - measure.y) / measure.height,
      ];
    }

    // レーンテンプレ
    const laneTemplate =
      chart.musicGameSystem.laneTemplates[setting.editLaneTypeIndex];

    const [nx, ny] = normalizeContainsPoint(targetMeasure, mousePosition);

    const hlDiv = chart.timeline.horizontalLaneDivision;

    const vlDiv = targetMeasureDivision;

    const maxObjectSize = 16;

    const p = (setting.objectSize - 1) / maxObjectSize / 2;

    const newLanePoint = {
      measureIndex: targetMeasure.index,
      measurePosition: new Fraction(
        vlDiv - 1 - _.clamp(Math.floor(ny * vlDiv), 0, vlDiv - 1),
        vlDiv
      ),
      guid: guid(),
      color: Number(laneTemplate.color),
      horizontalSize: setting.objectSize,
      templateName: laneTemplate.name,
      horizontalPosition: new Fraction(
        _.clamp(Math.floor((nx - p) * hlDiv), 0, hlDiv - setting.objectSize),
        hlDiv
      ),
    } as LanePoint;

    if (isClick) {
      chart.timeline.addLanePoint(newLanePoint);
      chart.save();
    } else {
      // プレビュー
      LanePointRenderer.render(
        newLanePoint,
        this.graphics,
        chart.timeline.measures[newLanePoint.measureIndex]
      );
    }
  }
}
