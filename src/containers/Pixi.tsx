import { observer } from "mobx-react";
import { Application, Graphics, Rectangle, Text } from "pixi.js";
import * as React from "react";
import { CSSProperties } from "react";
import Vector2 from "../math/Vector2";
import LanePointRenderer from "../objects/LanePointRenderer";
import MeasureController from "../objects/MeasureController";
import { EditMode } from "../stores/EditorSetting";
import { inject, InjectedComponent } from "../stores/inject";
import CustomRendererUtility from "../utils/CustomRendererUtility";
import * as pool from "../utils/pool";
import { Howl } from "howler";
import NoteController from "../objects/NoteController";
import OtherObjectController from "../objects/OtherObjectController";
import LaneController from "../objects/LaneController";
import Chart from "../stores/Chart";
import { IRangeSelectableTimelineObject } from "../objects/TimelineObject";
import PixiTextPool from "../utils/pixiTextPool";
import NoteLineController from "../objects/NoteLineController";
import MouseInfo from "../utils/mouseInfo";

@inject
@observer
export default class Pixi extends InjectedComponent {
  private app?: Application;
  private container?: HTMLDivElement;
  private graphics?: Graphics;
  private currentFrame = 0;

  private needRangeSelection = false;
  private isRangeSelection = false;
  private rangeSelectStartPoint: Vector2 | null = null;
  private rangeSelectEndPoint: Vector2 | null = null;
  private rangeSelectedObjects: IRangeSelectableTimelineObject[] = [];

  static debugGraphics?: Graphics;

  static instance?: Pixi;

  private noteController: NoteController | null = null;
  private noteLineController: NoteLineController | null = null;
  private otherObjectController: OtherObjectController | null = null;
  private laneController: LaneController | null = null;
  private measureController: MeasureController | null = null;

  /**
   * 前フレームの再生時間
   */
  previousTime = 0.0;

  private seMap = new Map<string, Howl>();

  public componentDidMount() {
    this.app = new Application({
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
      (e) => {
        if (e.buttons !== 1) {
          return;
        }

        if (
          this.injected.editor.currentChart?.currentLayer.lock ||
          this.injected.editor.setting.editMode !== EditMode.Select
        ) {
          return;
        }

        this.needRangeSelection = true;
        this.rangeSelectStartPoint = this.getMousePosition();
        this.rangeSelectEndPoint = this.getMousePosition();
      },
      false
    );

    this.container!.addEventListener(
      "mousemove",
      () => {
        if (this.isRangeSelection || this.needRangeSelection) {
          this.rangeSelectEndPoint = this.getMousePosition();
        }

        // 範囲選択開始判定
        if (
          this.needRangeSelection &&
          !this.isRangeSelection &&
          this.rangeSelectStartPoint!.distanceTo(this.rangeSelectEndPoint!) >
            4.0
        ) {
          this.isRangeSelection = true;
          if (!this.injected.editor.setting.isPressingModKey) {
            this.injected.editor.clearInspectorTarget();
          }
        }
      },
      false
    );

    const app = this.app;

    const graphics = (this.graphics = new Graphics());

    this.noteController = new NoteController(
      graphics,
      this.injected.editor,
      this.container!
    );

    this.noteLineController = new NoteLineController(
      graphics,
      this.injected.editor
    );

    this.otherObjectController = new OtherObjectController(
      graphics,
      this.injected.editor,
      this.container!
    );

    this.laneController = new LaneController(graphics, this.injected.editor);
    this.measureController = new MeasureController(
      graphics,
      this.injected.editor
    );

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

  /**
   * マウスの座標を取得する
   */
  private getMousePosition() {
    let { x, y } = this.app!.renderer.plugins.interaction.mouse.global;
    x -= this.graphics!.x;
    return new Vector2(x, y);
  }

  getRenderAreaSize() {
    return new Vector2(this.app!.renderer.width, this.app!.renderer.height);
  }

  /**
   * 描画範囲を取得する
   */
  getRenderArea() {
    return new Rectangle(
      -this.graphics!.x,
      0,
      this.app!.renderer.width,
      this.app!.renderer.height
    );
  }

  private readonly textPool = new PixiTextPool();

  public drawText(
    text: string,
    x: number,
    y: number,
    option?: any,
    maxWidth?: number,
    offset = [0.5, 0.5]
  ): Text {
    return this.textPool.drawText(
      this.graphics!,
      text,
      x,
      y,
      option,
      maxWidth,
      offset
    );
  }

  private cancelRangeSelection() {
    this.isRangeSelection = false;
    this.needRangeSelection = false;
    this.rangeSelectedObjects = [];
  }

  private readonly mouseInfo = new MouseInfo();

  /**
   * canvas を再描画する
   */
  private renderCanvas() {
    pool.resetAll();

    if (!this.app) return;
    if (!this.injected.editor.currentChart) return;

    CustomRendererUtility.update(this.currentFrame);

    Pixi.instance = this;
    const graphics = this.graphics!;
    Pixi.debugGraphics = graphics;

    this.textPool.update();

    const { editor } = this.injected;
    const { setting } = editor;
    const { theme, horizontalPadding, measureWidth } = setting;

    const chart = editor.currentChart!;

    const w = this.app!.renderer.width;
    const h = this.app!.renderer.height;

    const isLock = chart.currentLayer.lock;
    const canEdit = !isLock;

    this.app.view.style.cursor = isLock ? "not-allowed" : "default";

    this.mouseInfo.update(this.app!, this.graphics!);
    const { mouseInfo } = this;
    const { isClick } = mouseInfo;

    graphics.clear();

    chart.updateTime();
    const currentTime = chart.time - chart.startTime;

    this.measureController!.updateTime(chart, currentTime);

    setting.measureLayout.layout(
      editor.setting,
      this.app!.renderer,
      graphics,
      chart.timeline.measures
    );

    const { x: cx, y: cy } = this.measureController!.render(
      chart,
      this,
      setting
    );

    // 対象タイムラインを画面中央に配置する
    graphics.x = w / 2 - cx;

    graphics.x += (measureWidth + horizontalPadding) * (cy - 0.5);

    if (graphics.x > 0) graphics.x = 0;

    // レーン中間点描画
    if (setting.objectVisibility.lanePoint) {
      for (const lanePoint of chart.timeline.lanePoints) {
        const measure = chart.timeline.measures[lanePoint.measureIndex];

        LanePointRenderer.render(lanePoint, graphics, measure);
      }
    }

    const {
      targetMeasure,
      targetMeasureDivision,
      selectTargets: selectMeasure,
    } = this.measureController!.update(chart, canEdit, mouseInfo);

    editor.currentMeasurePosition = this.measureController!.currentMeasurePosition;

    const { targetNotePoint } = this.laneController!.update(
      chart,
      canEdit,
      mouseInfo,
      targetMeasure,
      targetMeasure ? chart.timeline.measures[targetMeasure.index + 1] : null,
      targetMeasureDivision
    );

    const {
      selectTargets: selectOtherObjects,
    } = this.otherObjectController!.update(
      chart,
      canEdit,
      mouseInfo,
      targetMeasure,
      targetMeasureDivision,
      (value) => (this.app!.view.style.cursor = value),
      () => this.cancelRangeSelection()
    );

    const {
      selectTargets: selectNoteLines,
      noteLineInfos,
    } = this.noteLineController!.update(
      chart,
      mouseInfo,
      chart.timeline.measures,
      targetMeasure,
      () => this.cancelRangeSelection()
    );

    const { selectTargets: selectNotes } = this.noteController!.update(
      chart,
      canEdit,
      mouseInfo,
      targetMeasure,
      targetMeasure ? chart.timeline.measures[targetMeasure.index + 1] : null,
      targetMeasureDivision,
      targetNotePoint,
      (value) => (this.app!.view.style.cursor = value),
      () => this.cancelRangeSelection(),
      noteLineInfos
    );

    // カーソルを合わせているオブジェクトを描画
    const selectTargets =
      selectNotes ?? selectNoteLines ?? selectOtherObjects ?? selectMeasure;
    if (selectTargets && !this.isRangeSelection) {
      if (setting.editMode === EditMode.Select && isClick) {
        if (!editor.setting.isPressingModKey) {
          editor.clearInspectorTarget();
        }
      }

      for (const selectTarget of selectTargets) {
        if (!selectTarget.isSelected) {
          selectTarget.drawBounds(graphics, theme.hover);
        }

        if (setting.editMode === EditMode.Select && isClick) {
          /*
          if (!editor.setting.isPressingModKey) {
            editor.clearInspectorTarget();
          }
           */

          editor.addInspectorTarget(selectTarget);
        }
      }
    } else {
      if (!selectTargets && isClick && !this.isRangeSelection) {
        editor.clearInspectorTarget();
      }
    }

    // 選択中表示
    for (const object of editor.inspectorTargets) {
      object.drawBounds?.(graphics, theme.selected);
    }

    // 範囲選択
    if (this.isRangeSelection) {
      this.selectRange(chart);
    }

    this.playSe(chart, currentTime);

    this.previousTime = currentTime;

    if (isClick) {
      this.cancelRangeSelection();
    }
  }

  private selectRange(chart: Chart) {
    const graphics = this.graphics!;
    const { editor } = this.injected;

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
    const x = [this.rangeSelectStartPoint!.x, this.rangeSelectEndPoint!.x].sort(
      (a, b) => a - b
    );
    const y = [this.rangeSelectStartPoint!.y, this.rangeSelectEndPoint!.y].sort(
      (a, b) => a - b
    );

    const rect = new Rectangle(x[0], y[0], x[1] - x[0], y[1] - y[0]);

    // 選択範囲内に配置されているノートを選択する
    for (const object of [
      ...chart.timeline.notes,
      ...chart.timeline.otherObjects,
    ]) {
      if (!object.isVisible) continue;

      const { x, y, width, height } = object.getBounds();

      const inRange =
        rect.contains(x, y) && rect.contains(x + width, y + height);
      const isSelected = this.rangeSelectedObjects.includes(object);

      // 範囲内のものが未選択なら選択
      if (inRange && !isSelected) {
        this.rangeSelectedObjects.push(object);
        editor.addInspectorTarget(object);
      }

      // 選択済みのものが範囲外になっていたら選択を外す
      if (!inRange && isSelected) {
        this.rangeSelectedObjects = this.rangeSelectedObjects.filter(
          (x) => x !== object
        );
        editor.removeInspectorTarget(object);
      }
    }
  }

  private playSe(chart: Chart, currentTime: number) {
    const musicGameSystem = chart.musicGameSystem;

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
