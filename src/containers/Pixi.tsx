import * as _ from "lodash";
import { observer } from "mobx-react";
import * as PIXI from "pixi.js";
import * as React from "react";
import { CSSProperties } from "react";
import { Fraction } from "../math";
import Vector2 from "../math/Vector2";
import { Lane } from "../objects/Lane";
import { LanePoint } from "../objects/LanePoint";
import LanePointRenderer from "../objects/LanePointRenderer";
import { NotePointInfo } from "../objects/LaneRenderer";
import LaneRendererResolver from "../objects/LaneRendererResolver";
import { Measure, sortMeasureData } from "../objects/Measure";
import MeasureController from "../objects/MeasureController";
import { Note, NoteRecord } from "../objects/Note";
import { NoteLineRecord } from "../objects/NoteLine";
import NoteLineRendererResolver from "../objects/NoteLineRendererResolver";
import NoteRendererResolver from "../objects/NoteRendererResolver";
import { OtherObject, OtherObjectRecord } from "../objects/OtherObject";
import { EditMode, ObjectCategory } from "../stores/EditorSetting";
import { inject, InjectedComponent } from "../stores/inject";
import CustomRendererUtility from "../utils/CustomRendererUtility";
import { guid } from "../utils/guid";
import * as pool from "../utils/pool";
import { OtherObjectRenderer } from "../objects/OtherObjectRenderer";
import { Howl } from "howler";

@inject
@observer
export default class Pixi extends InjectedComponent {
  private app?: PIXI.Application;
  private container?: HTMLDivElement;
  private graphics?: PIXI.Graphics;
  private currentFrame = 0;

  private isRangeSelection = false;
  private rangeSelectStartPoint: PIXI.Point | null = null;
  private rangeSelectEndPoint: PIXI.Point | null = null;
  private rangeSelectedObjects: any[] = [];

  private selectOtherObjectOrderIndex = 0;

  public componentDidMount() {
    this.app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      antialias: true,
      transparent: true,
    });

    this.app.view.style.width = "100%";
    this.app.view.style.height = "100%";

    this.container!.appendChild(this.app.view);

    this.container!.addEventListener(
      "mousewheel",
      (e: any) => {
        const chart = this.injected.editor.currentChart!;
        const direction = this.injected.editor.setting.reverseScroll ? -1 : 1;
        chart.setTime(chart.time + e.wheelDelta * 0.01 * direction, true);
      },
      false
    );

    this.container!.addEventListener(
      "mousedown",
      () => {
        if (!this.injected.editor.setting.isPressingModKey) {
          this.injected.editor.clearInspectorTarget();
        }

        if (
          this.injected.editor.currentChart?.currentLayer.lock ||
          this.injected.editor.setting.editMode !== EditMode.Select
        ) {
          return;
        }
        this.isRangeSelection = true;
        this.rangeSelectStartPoint = this.getMousePosition();
        this.rangeSelectEndPoint = this.getMousePosition();
      },
      false
    );

    this.container!.addEventListener(
      "mousemove",
      () => {
        if (!this.isRangeSelection) return;
        this.rangeSelectEndPoint = this.getMousePosition();
      },
      false
    );

    const app = this.app;

    const graphics = (this.graphics = new PIXI.Graphics());

    app.stage.addChild(graphics);

    app.stage.x = 0;
    app.stage.y = 0;

    app.renderer.plugins.interaction.moveWhenInside = false;

    app.ticker.add(() => {
      const w = app!.view.parentElement!.parentElement!.clientWidth;
      const h = app!.view.parentElement!.parentElement!.clientHeight;

      // リサイズ
      if (app.renderer.width !== w || app.renderer.height !== h) {
        app.renderer.resize(w, h);
        this.update3D();
      }
      this.renderCanvas();

      this.currentFrame++;
      this.injected.editor.currentFrame++;
    });

    this.app.start();

    this.update3D();
  }

  componentWillUnmount() {
    this.app!.stop();
  }

  private temporaryTexts: PIXI.Text[] = [];

  static debugGraphics?: PIXI.Graphics;

  static instance?: Pixi;

  private tempTextIndex = 0;

  /**
   * マウスの座標を取得する
   */
  private getMousePosition() {
    const mousePosition = _.clone(
      this.app!.renderer.plugins.interaction.mouse.global
    );
    mousePosition.x -= this.graphics!.x;
    return mousePosition;
  }

  getRenderAreaSize() {
    return new Vector2(this.app!.renderer.width, this.app!.renderer.height);
  }

  /**
   * 描画範囲を取得する
   */
  getRenderArea() {
    return new PIXI.Rectangle(
      -this.graphics!.x,
      0,
      this.app!.renderer.width,
      this.app!.renderer.height
    );
  }

  public drawText(
    text: string,
    x: number,
    y: number,
    option?: any,
    maxWidth?: number,
    offset = [0.5, 0.5]
  ) {
    if (this.tempTextIndex >= this.temporaryTexts.length) {
      const t = new PIXI.Text("");
      this.graphics!.addChild(t);
      this.temporaryTexts.push(t);
    }

    const t: PIXI.Text & {
      // 前フレームのスタイル
      previousStyleOptions?: any;
      previousMaxWidth?: number;
    } = this.temporaryTexts[this.tempTextIndex];

    t.anchor.set(offset[0], offset[1]);

    // .text か .style に値を代入すると再描画処理が入るので
    // 前フレームと比較して更新を最小限にする
    if (
      t.text !== text ||
      !_.isEqual(t.previousStyleOptions, option) ||
      t.previousMaxWidth !== maxWidth
    ) {
      t.text = text;
      t.style = Object.assign(
        {
          fontFamily: "'Noto Sans JP', sans-serif",
          align: "center",
          fontSize: 20,
          fill: 0xffffff,
          dropShadow: true,
          dropShadowBlur: 8,
          dropShadowColor: "#000000",
          dropShadowDistance: 0,
        },
        option
      ) as PIXI.TextStyle;

      // 拡大率をリセットして文字の横幅を算出する
      t.scale.x = 1;
      if (maxWidth !== undefined) {
        t.scale.x = Math.min(1, maxWidth / t.width);
      }

      t.previousStyleOptions = option;
      t.previousMaxWidth = maxWidth;
    }
    t.x = x;
    t.y = y;

    t.visible = true;

    this.tempTextIndex++;
  }

  prev: number = 0;

  connectTargetNote: Note | null = null;
  connectTargetLanePoint: LanePoint | null = null;

  /**
   * 前フレームの再生時間
   */
  previousTime = 0.0;

  private inspectTarget: any[] = [];

  private inspect(target: any) {
    this.inspectTarget.push(target);
  }

  private seMap = new Map<string, Howl>();

  /**
   * canvas を再描画する
   */
  private renderCanvas() {
    pool.resetAll();
    this.inspectTarget = [];

    if (!this.app) return;
    if (!this.injected.editor.currentChart) return;

    CustomRendererUtility.update(this.currentFrame);

    Pixi.instance = this;
    const graphics = this.graphics!;
    Pixi.debugGraphics = graphics;

    // 一時テキストを削除
    for (const temp of this.temporaryTexts) temp.visible = false;
    this.tempTextIndex = 0;

    const { editor } = this.injected;
    const { setting } = editor;
    const { theme, horizontalPadding, measureWidth } = setting;

    const chart = editor.currentChart!;
    const musicGameSystem = chart.musicGameSystem;

    const timeCalculator = chart.timeline.timeCalculator;

    const w = this.app!.renderer.width;
    const h = this.app!.renderer.height;

    const buttons = this.app!.renderer.plugins.interaction.mouse.buttons;

    let isClick = this.prev === 1 && buttons === 0;
    let isRight = buttons === 2;

    const viewRect = this.app!.view.getBoundingClientRect();

    const isLock = chart.currentLayer.lock;
    const canEdit = !isLock;

    this.app.view.style.cursor = isLock ? "not-allowed" : "default";

    const canConnect = (head: Note, tail: Note) => {
      const { allowRightAngle } = musicGameSystem.noteTypeMap.get(tail.type)!;
      return (
        // 接続可能なノートタイプなら
        musicGameSystem.noteTypeMap
          .get(head.type)!
          .connectableTypes.includes(tail.type) &&
        // 直角配置チェック
        (allowRightAngle || !tail.isSameMeasurePosition(head))
      );
    };

    // 編集画面外ならクリックしていないことにする
    const mousePosition = _.clone(
      this.app!.renderer.plugins.interaction.mouse.global
    );
    if (
      !new PIXI.Rectangle(0, 0, viewRect.width, viewRect.height).contains(
        mousePosition.x,
        mousePosition.y
      )
    ) {
      isClick = false;
    }
    mousePosition.x -= graphics.x;

    this.prev = buttons;

    graphics.clear();

    // BPM が 1 つも存在しなかったら仮 BPM を先頭に配置する
    if (!chart.timeline.otherObjects.some((object) => object.isBPM())) {
      chart.timeline.addOtherObject(
        OtherObjectRecord.createInstance(
          {
            type: 0,
            guid: guid(),
            measureIndex: 0,
            measurePosition: new Fraction(0, 1),
            value: 120,
            layer: chart.layers[0].guid,
          },
          chart.musicGameSystem.otherObjectTypes
        )
      );
      chart.save();
    }

    chart.updateTime();
    const currentTime = chart.time - chart.startTime;

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

    setting.measureLayout.layout(
      editor.setting,
      this.app!.renderer,
      graphics,
      chart.timeline.measures
    );

    const measureController = new MeasureController();
    const { x: cx, y: cy } = measureController.render(
      chart,
      graphics,
      this,
      setting
    );

    // 対象タイムラインを画面中央に配置する
    graphics.x = w / 2 - cx;

    graphics.x += (measureWidth + horizontalPadding) * (cy - 0.5);

    if (graphics.x > 0) graphics.x = 0;

    // カーソルを合わせている小節
    const targetMeasure = chart.timeline.measures.find((measure) =>
      measure.containsPoint(mousePosition)
    );
    const measureDivision = this.injected.editor.setting.measureDivision;
    const targetMeasureDivision = !targetMeasure
      ? 1
      : measureDivision * Fraction.to01(targetMeasure.beat);

    if (targetMeasure) {
      // ターゲット小節の枠を描画
      if (canEdit && !targetMeasure.isSelected) {
        targetMeasure.drawBounds(graphics, theme.hover);
      }

      const s = targetMeasure;

      // ターゲット小節の分割線を描画
      if (canEdit) {
        const div = targetMeasureDivision;
        for (let i = 1; i < div; ++i) {
          const y = s.y + (s.height / div) * (div - i);
          graphics
            .lineStyle(2, 0xffffff, (4 * i) % measureDivision === 0 ? 1 : 0.6)
            .moveTo(s.x, y)
            .lineTo(s.x + measureWidth, y);
        }
      }

      // 小節選択
      if (canEdit && setting.editMode === EditMode.Select && isClick) {
        this.inspect(targetMeasure);
      }

      // レーン追加モードなら小節の横分割線を描画
      if (
        canEdit &&
        setting.editMode === EditMode.Add &&
        setting.editObjectCategory === ObjectCategory.Lane
      ) {
        for (
          let i = 1;
          i <
          this.injected.editor.currentChart!.timeline.horizontalLaneDivision;
          ++i
        ) {
          const x =
            s.x +
            (measureWidth /
              this.injected.editor.currentChart!.timeline
                .horizontalLaneDivision) *
              i;

          graphics
            .lineStyle(2, 0xffffff, 0.8)
            .moveTo(x, s.y)
            .lineTo(x, s.y + s.height);
        }
      }
    }

    // レーン中間点描画
    if (setting.objectVisibility.lanePoint) {
      for (const lanePoint of chart.timeline.lanePoints) {
        const measure = chart.timeline.measures[lanePoint.measureIndex];

        LanePointRenderer.render(lanePoint, graphics, measure);
      }
    }

    let targetNotePoint: NotePointInfo | null = null;

    const newNoteType =
      chart.musicGameSystem.noteTypes[setting.editNoteTypeIndex];

    // レーン描画
    for (const lane of chart.timeline.lanes) {
      const laneRenderer = LaneRendererResolver.resolve(lane);

      laneRenderer.render(
        lane,
        graphics,
        chart.timeline.lanePointMap,
        chart.timeline.measures,
        targetMeasure || null,
        newNoteType
      );

      // ノート配置モードなら選択中のレーンを計算する
      {
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

        const newNoteType =
          chart.musicGameSystem.noteTypes[setting.editNoteTypeIndex];

        // 配置できないレーンならやめる
        if ((newNoteType.excludeLanes || []).includes(lane.templateName)) {
          continue;
        }

        targetNotePoint = laneRenderer.getNotePointInfoFromMousePosition(
          lane,
          targetMeasure!,
          targetMeasureDivision,
          new Vector2(mousePosition.x, mousePosition.y)
        );
      }
    }

    // 可視レイヤーの GUID
    const visibleLayers = new Set(
      chart.layers.filter((layer) => layer.visible).map((layer) => layer.guid)
    );

    // ノート更新
    for (const note of chart.timeline.notes) {
      const measure = chart.timeline.measures[note.measureIndex];

      // 小節とレイヤーが表示されているなら描画する
      note.isVisible = measure.isVisible && visibleLayers.has(note.layer);
    }

    // その他オブジェクト描画
    OtherObjectRenderer.updateFrame();
    for (const object of chart.timeline.otherObjects) {
      const measure = chart.timeline.measures[object.measureIndex];

      /*
      const isVisible = measure.isVisible && visibleLayers.has(object.layer);
      if (!isVisible) return;
      */

      OtherObjectRenderer.render(
        chart.musicGameSystem.otherObjectTypes,
        object,
        graphics,
        measure
      );

      if (editor.inspectorTargets.includes(object)) {
        OtherObjectRenderer.drawBounds(
          object,
          measure,
          graphics,
          theme.selected
        );
      }
    }

    // その他オブジェクト配置
    if (
      canEdit &&
      targetMeasure &&
      setting.editMode === EditMode.Add &&
      setting.editObjectCategory === ObjectCategory.Other
    ) {
      const [, ny] = normalizeContainsPoint(targetMeasure, mousePosition);

      const vlDiv = targetMeasureDivision;

      const newObject = OtherObjectRecord.createInstance(
        {
          type: setting.editOtherTypeIndex,
          measureIndex: targetMeasure.index,
          measurePosition: new Fraction(
            vlDiv - 1 - _.clamp(Math.floor(ny * vlDiv), 0, vlDiv - 1),
            vlDiv
          ),
          guid: guid(),
          value: setting.otherValue,
          layer: chart.currentLayer.guid,
        },
        chart.musicGameSystem.otherObjectTypes
      );

      if (isClick) {
        chart.timeline.addOtherObject(newObject);
        chart.save();
      } else {
        // プレビュー
        OtherObjectRenderer.render(
          chart.musicGameSystem.otherObjectTypes,
          newObject,
          graphics,
          chart.timeline.measures[newObject.measureIndex]
        );
      }
    }

    // その他オブジェクト選択/削除
    if (
      canEdit &&
      (setting.editMode === EditMode.Select ||
        setting.editMode === EditMode.Delete)
    ) {
      const selectObjectOptions: {
        object: OtherObject;
        order: number;
      }[] = [];

      for (const object of chart.timeline.otherObjects) {
        const bounds = OtherObjectRenderer.getBounds(
          object,
          chart.timeline.measures[object.measureIndex]
        );

        if (bounds.contains(mousePosition.x, mousePosition.y)) {
          const measure = chart.timeline.measures[object.measureIndex];

          const renderOrder = OtherObjectRenderer.drawBounds(
            object,
            measure,
            graphics,
            theme.hover
          );

          selectObjectOptions.push({ object, order: renderOrder });
        }
      }

      if (isClick && selectObjectOptions.length > 0) {
        const selectObject = _.orderBy(selectObjectOptions, "order")[
          this.selectOtherObjectOrderIndex++ % selectObjectOptions.length
        ].object;

        if (setting.editMode === EditMode.Select) {
          this.inspect(selectObject);
        } else if (setting.editMode === EditMode.Delete) {
          chart.timeline.removeOtherObject(selectObject);
          chart.save();
        }
      }
    }

    // ノートライン描画
    for (const noteLine of chart.timeline.noteLines) {
      NoteLineRendererResolver.resolve(noteLine).render(
        noteLine,
        graphics,
        chart.timeline.notes
      );
    }

    // マウスがノート上にあるか
    let isMouseOnNote = false;

    // ノート描画
    for (const note of chart.timeline.notes) {
      if (!note.isVisible) continue;

      NoteRendererResolver.resolve(note).render(note, graphics);

      // ノート関連の操作
      if (setting.editObjectCategory !== ObjectCategory.Note) continue;

      const bounds = note.getBounds();
      if (!bounds.contains(mousePosition.x, mousePosition.y)) continue;
      isMouseOnNote = true;

      // ノート選択 or 削除
      if (
        canEdit &&
        (setting.editMode === EditMode.Select ||
          setting.editMode === EditMode.Delete)
      ) {
        if (!note.isSelected) note.drawBounds(graphics, theme.hover);

        if (isClick) {
          if (setting.editMode === EditMode.Delete) {
            chart.timeline.removeNote(note);
            chart.save();
          }
          if (setting.editMode === EditMode.Select) {
            // 既に別のオブジェクトを選択していたら解除
            if (this.inspectTarget.length > 0) {
              this.inspectTarget = [];
            }

            this.inspect(note);

            var noteLine = chart.timeline.noteLines.find(
              (noteLine) => noteLine.head == note.guid
            );
            if (noteLine) {
              this.inspect(noteLine);
            }
          }
        }

        if (isRight) {
          this.isRangeSelection = false;
          chart.timeline.removeNote(note);
          chart.save();
        }
      }

      // ノート接続
      if (setting.editMode === EditMode.Connect) {
        graphics
          .lineStyle(2, 0xff9900)
          .drawRect(bounds.x, bounds.y, bounds.width, bounds.height);

        if (
          this.connectTargetNote &&
          canConnect(this.connectTargetNote, note)
        ) {
          const [head, tail] = [this.connectTargetNote!, note!].sort(
            sortMeasureData
          );

          const newNoteLine = NoteLineRecord.new({
            guid: guid(),
            head: head.guid,
            tail: tail.guid,
            bezier: {
              enabled: false,
              x: 1,
              y: 0.5,
            },
          });

          // ノートラインプレビュー
          NoteLineRendererResolver.resolve(newNoteLine).render(
            newNoteLine,
            graphics,
            chart.timeline.notes
          );

          if (isClick) {
            // 同じノートを接続しようとしたら接続状態をリセットする
            if (this.connectTargetNote === note) {
              this.connectTargetNote = null;
            } else {
              chart.timeline.addNoteLine(newNoteLine);
              chart.save();

              this.connectTargetNote = note;
            }
          }
        } else {
          if (isClick) {
            this.connectTargetNote = note;
          }
        }
      }
    }

    // 選択中表示
    for (const object of editor.inspectorTargets) {
      object.drawBounds?.(graphics, theme.selected);
    }

    // 接続モードじゃないかノート外をタップしたら接続対象ノートを解除
    if (setting.editMode !== EditMode.Connect || (isClick && !isMouseOnNote)) {
      this.connectTargetNote = null;
    }

    // レーン選択中ならノートを配置する
    if (
      canEdit &&
      targetMeasure &&
      targetNotePoint &&
      setting.editMode === EditMode.Add &&
      setting.editObjectCategory === ObjectCategory.Note
    ) {
      const newNoteType =
        chart.musicGameSystem.noteTypes[setting.editNoteTypeIndex];

      // 新規ノート
      const newNote = NoteRecord.new(
        {
          guid: guid(),
          horizontalSize: setting.objectSize,
          horizontalPosition: new Fraction(
            targetNotePoint!.horizontalIndex,
            targetNotePoint!.lane.division
          ),
          measureIndex: targetMeasure.index,
          measurePosition: new Fraction(
            targetMeasureDivision - 1 - targetNotePoint!.verticalIndex!,
            targetMeasureDivision
          ),
          type: newNoteType.name,
          speed: 1,
          lane: targetNotePoint!.lane.guid,
          layer: chart.currentLayer.guid,
          editorProps: {
            time: 0,
          },
          customProps: {
            customColor: setting.customPropColor,
          },
        },
        chart
      );

      const { previouslyCreatedNote } = chart.timeline;

      if (setting.isPressingModKey && previouslyCreatedNote) {
        const head = previouslyCreatedNote;
        const tail = newNote;

        if (canConnect(head, tail)) {
          // ノートラインプレビュー
          NoteLineRendererResolver.resolveByNoteType(head.type).renderByNote(
            head,
            tail,
            NoteLineRecord.new({
              guid: guid(),
              head: head.guid,
              tail: tail.guid,
              bezier: {
                enabled: false,
                x: 1,
                y: 0.5,
              },
            }),
            this.graphics!
          );
        }
      }

      if (isClick) {
        // 同じレーンの重なっているノートを取得する
        const overlapNotes = chart.timeline.notes.filter(
          (note) =>
            note.lane === newNote.lane &&
            note.layer === newNote.layer &&
            note.isSameMeasurePosition(newNote) &&
            newNote.horizontalPosition.numerator <=
              note.horizontalPosition.numerator + note.horizontalSize - 1 &&
            note.horizontalPosition.numerator <=
              newNote.horizontalPosition.numerator + newNote.horizontalSize - 1
        );

        // 重なっているノートを削除する
        for (const note of overlapNotes) {
          chart.timeline.removeNote(note);
        }

        chart.timeline.addNote(newNote, true, true);

        // 接続
        const head = previouslyCreatedNote;
        const tail = newNote;

        if (setting.isPressingModKey && head && canConnect(head, tail)) {
          const newNoteLine = NoteLineRecord.new({
            guid: guid(),
            head: head.guid,
            tail: tail.guid,
            bezier: {
              enabled: false,
              x: 0,
              y: 0,
            },
          });

          chart.timeline.addNoteLine(newNoteLine);
          chart.save();
        }

        chart.timeline.previouslyCreatedNote = newNote;

        chart.save();
      } else {
        NoteRendererResolver.resolve(newNote).render(newNote, graphics);
      }
    }

    function normalizeContainsPoint(measure: Measure, point: PIXI.Point) {
      return [
        (point.x - measure.x) / measure.width,
        (point.y - measure.y) / measure.height,
      ];
    }

    // 接続モード && レーン編集
    if (
      canEdit &&
      targetMeasure &&
      setting.editMode === EditMode.Connect &&
      setting.editObjectCategory === ObjectCategory.Lane
    ) {
      for (const lanePoint of this.injected.editor.currentChart!.timeline
        .lanePoints) {
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
              graphics,
              chart.timeline.lanePointMap,
              chart.timeline.measures,
              null,
              newNoteType
            );

            if (isClick) {
              chart.timeline.addLane(newLane);
              chart.timeline.optimiseLane();
            }
          }

          if (isClick) {
            this.connectTargetLanePoint = lanePoint;
          }
        }
      }
    }

    // 接続中のノートが削除されたら後始末
    if (
      this.connectTargetNote &&
      !chart.timeline.notes.includes(this.connectTargetNote)
    ) {
      this.connectTargetNote = null;
    }

    // 接続しようとしてるノートの枠を描画
    if (this.connectTargetNote) {
      const bounds = this.connectTargetNote.getBounds();

      graphics
        .lineStyle(2, 0xff9900)
        .drawRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }

    // レーン配置
    if (
      canEdit &&
      targetMeasure &&
      setting.editMode === EditMode.Add &&
      setting.editObjectCategory === ObjectCategory.Lane
    ) {
      // レーンテンプレ
      const laneTemplate = editor.currentChart!.musicGameSystem.laneTemplates[
        setting.editLaneTypeIndex
      ];

      const [nx, ny] = normalizeContainsPoint(targetMeasure, mousePosition);

      const hlDiv = this.injected.editor.currentChart!.timeline
        .horizontalLaneDivision;

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
        this.injected.editor.currentChart!.timeline.addLanePoint(newLanePoint);
        chart.save();
      } else {
        // プレビュー
        LanePointRenderer.render(
          newLanePoint,
          graphics,
          chart.timeline.measures[newLanePoint.measureIndex]
        );
      }
    }

    // 範囲選択
    if (this.isRangeSelection) {
      graphics
        .lineStyle(2, 0x0099ff)
        .beginFill(0x0099ff, 0.2)
        .drawRect(
          this.rangeSelectStartPoint!.x,
          this.rangeSelectStartPoint!.y,
          this.rangeSelectEndPoint!.x - this.rangeSelectStartPoint!.x,
          this.rangeSelectEndPoint!.y - this.rangeSelectStartPoint!.y
        )
        .endFill();

      // start, end を左上から近い順にソートする
      const x = [
        this.rangeSelectStartPoint!.x,
        this.rangeSelectEndPoint!.x,
      ].sort((a, b) => a - b);
      const y = [
        this.rangeSelectStartPoint!.y,
        this.rangeSelectEndPoint!.y,
      ].sort((a, b) => a - b);

      const rect = new PIXI.Rectangle(x[0], y[0], x[1] - x[0], y[1] - y[0]);

      // 選択範囲内に配置されているノートを選択する
      for (const note of chart.timeline.notes) {
        if (!note.isVisible) continue;

        const inRange =
          rect.contains(note.x, note.y) &&
          rect.contains(note.x + note.width, note.y + note.height);
        const isSelected = this.rangeSelectedObjects.includes(note);

        // 範囲内のものが未選択なら選択
        if (inRange && !isSelected) {
          this.rangeSelectedObjects.push(note);
          editor.addInspectorTarget(note);
        }
        // 選択済みのものが範囲外になっていたら選択を外す
        if (!inRange && isSelected) {
          this.rangeSelectedObjects = this.rangeSelectedObjects.filter(
            (x) => x !== note
          );
          editor.removeInspectorTarget(note);
        }
      }
    }

    this.seMap.clear();

    // 再生時間がノートの判定時間を超えたら SE を鳴らす
    for (const note of chart.timeline.notes) {
      // 判定時間
      const judgeTime = note.editorProps.time;

      // 時間が巻き戻っていたら SE 再生済みフラグをリセットする
      if (currentTime < this.previousTime && currentTime < judgeTime) {
        note.sePlayed = false;
      }

      if (!chart.isPlaying || note.sePlayed) continue;

      if (currentTime >= judgeTime) {
        // SE を鳴らす
        if (
          !this.seMap.has(note.type) &&
          musicGameSystem.seMap.has(note.type)
        ) {
          this.seMap.set(
            note.type,
            musicGameSystem.seMap.get(note.type)!.next()
          );
        }
        note.sePlayed = true;
      }
    }

    for (const se of this.seMap.values()) {
      se.volume(chart.seVolume);
      se.play();
    }

    this.previousTime = currentTime;

    if (isClick) {
      this.isRangeSelection = false;
      if (
        this.inspectTarget.length > 0 &&
        this.rangeSelectedObjects.length === 0
      ) {
        for (const inspectTarget of this.inspectTarget) {
          editor.addInspectorTarget(inspectTarget);
        }
      }
      this.rangeSelectedObjects = [];
    }
  }

  update3D() {
    const setting = this.injected.editor.setting;

    if (!this.app) return;

    if (setting.preserve3D) {
      this.app.view.style.transform = `
        rotateX(${setting.rotateX}deg)
        scale(${setting.scale3D})
      `;
      this.app.view.style.transformOrigin = "50% 100% 0px";
      this.app.view.style.boxShadow = `
        +${this.app.view.width}px 0px #000,
        -${this.app.view.width}px 0px #000
      `;
    } else {
      this.app.view.style.transform = "";
      this.app.view.style.transformOrigin = "";
      this.app.view.style.boxShadow = "";
    }
  }

  render() {
    let component = this;
    const setting = this.injected.editor.setting;

    this.update3D();

    const style2d: CSSProperties = {
      height: "100%",
      overflow: "hidden",
      backgroundColor: "black",
      backgroundSize: "cover",
    };

    if (setting.backgroundImageUrl) {
      style2d.backgroundImage = `url(${setting.backgroundImageUrl})`;
    }

    return (
      <div
        id="3d-container"
        style={
          setting.preserve3D
            ? {
                transformStyle: "preserve-3d",
                perspective: setting.perspective + "px",
                height: "100%",
                overflow: "hidden",
              }
            : style2d
        }
        ref={(thisDiv) => {
          component.container = thisDiv!;
        }}
      />
    );
  }
}
