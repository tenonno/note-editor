import * as PIXI from "pixi.js";
import { Note, NoteRecord, NoteResizeInfo } from "./Note";
import NoteRendererResolver from "./NoteRendererResolver";
import { EditMode, ObjectCategory } from "../stores/EditorSetting";
import Vector2 from "../math/Vector2";
import { Measure, sortMeasureData } from "./Measure";
import { NoteLine, NoteLineRecord } from "./NoteLine";
import { guid } from "../utils/guid";
import NoteLineRendererResolver from "./NoteLineRendererResolver";
import Chart from "../stores/Chart";
import Editor from "../stores/EditorStore";
import { Fraction, inverseLerp, lerp } from "../math";
import { NotePointInfo } from "./LaneRenderer";
import LaneRendererResolver from "./LaneRendererResolver";
import MusicGameSystem from "../stores/MusicGameSystem";
import TimelineObject from "./TimelineObject";
import { NoteLineInfo } from "./Lane";
import { NoteLineRenderInfo } from "./NoteLineRenderer";
import MouseInfo from "../utils/mouseInfo";

type UpdateResult = {
  selectTargets: TimelineObject[] | null;
};

export default class NoteController {
  private wResizeNoteInfo: NoteResizeInfo | null = null;
  private eResizeNoteInfo: NoteResizeInfo | null = null;

  private dragTargetNote: Note | null = null;
  private dragTargetNotePressPositionDiff: Vector2 | null = null;

  private connectTargetNote: Note | null = null;

  public constructor(
    private graphics: PIXI.Graphics,
    private editor: Editor,
    container: HTMLDivElement
  ) {
    container.addEventListener(
      "mouseup",
      () => {
        if (
          this.dragTargetNote ||
          this.wResizeNoteInfo ||
          this.eResizeNoteInfo
        ) {
          editor.currentChart?.save();
        }

        this.dragTargetNote = null;
        this.wResizeNoteInfo = null;
        this.eResizeNoteInfo = null;
      },
      false
    );
  }

  private dragAndResize(
    chart: Chart,
    targetMeasure: Measure,
    targetNextMeasure: Measure,
    mousePosition: { x: number; y: number },
    targetMeasureDivision: number
  ) {
    const { setting } = this.editor;

    if (setting.editMode !== EditMode.Select) {
      return;
    }

    const getNotePointInfo = (
      noteTypeText: string,
      additionalPosition: Vector2
    ): NotePointInfo | null => {
      const noteType = chart.musicGameSystem.noteTypeMap.get(noteTypeText)!;

      for (const lane of chart.timeline.lanes) {
        const laneRenderer = LaneRendererResolver.resolve(lane);

        // 配置できないレーンならやめる
        if ((noteType.excludeLanes || []).includes(lane.templateName)) {
          continue;
        }

        const targetNotePoint = laneRenderer.getNotePointInfoFromMousePosition(
          lane,
          targetMeasure!,
          targetNextMeasure!,
          targetMeasureDivision,
          Vector2.add(
            new Vector2(mousePosition.x, mousePosition.y),
            additionalPosition
          )
        );
        if (targetNotePoint) {
          return targetNotePoint;
        }
      }

      return null;
    };

    // ノートのリサイズ
    if (this.wResizeNoteInfo) {
      const targetNotePoint = getNotePointInfo(
        this.wResizeNoteInfo.targetNote.type,
        this.wResizeNoteInfo.mousePosition
      );

      if (targetNotePoint) {
        this.wResizeNoteInfo.targetNote.horizontalPosition = new Fraction(
          targetNotePoint!.horizontalIndex,
          targetNotePoint!.lane.division
        );

        this.wResizeNoteInfo.targetNote.horizontalSize =
          this.wResizeNoteInfo.targetNoteClone.horizontalSize +
          this.wResizeNoteInfo.targetNoteClone.horizontalPosition.numerator -
          targetNotePoint!.horizontalIndex;
      }
    }

    // ノートのリサイズ
    if (this.eResizeNoteInfo) {
      const targetNotePoint = getNotePointInfo(
        this.eResizeNoteInfo.targetNote.type,
        this.eResizeNoteInfo.mousePosition
      );

      if (targetNotePoint) {
        this.eResizeNoteInfo.targetNote.horizontalSize =
          this.eResizeNoteInfo.targetNoteClone.horizontalSize +
          targetNotePoint!.horizontalIndex -
          this.eResizeNoteInfo.targetNoteClone.horizontalPosition.numerator;
      }
    }

    // ノートのドラッグ
    if (this.dragTargetNote) {
      const targetNotePoint = getNotePointInfo(
        this.dragTargetNote.type,
        this.dragTargetNotePressPositionDiff!
      );

      if (targetNotePoint) {
        this.dragTargetNote.horizontalPosition = new Fraction(
          targetNotePoint!.horizontalIndex,
          targetNotePoint!.lane.division
        );

        this.dragTargetNote.measureIndex = targetNotePoint!.measureIndex;
        this.dragTargetNote.measurePosition = new Fraction(
          targetMeasureDivision - 1 - targetNotePoint!.verticalIndex!,
          targetMeasureDivision
        );
      }
    }
  }

  private static canConnect(
    musicGameSystem: MusicGameSystem,
    head: Note,
    tail: Note
  ) {
    const { allowRightAngle } = musicGameSystem.noteTypeMap.get(tail.type)!;
    return (
      // 接続可能なノートタイプなら
      musicGameSystem.noteTypeMap
        .get(head.type)!
        .connectableTypes.includes(tail.type) &&
      // 直角配置チェック
      (allowRightAngle || !tail.isSameMeasurePosition(head))
    );
  }

  public update(
    chart: Chart,
    canEdit: boolean,
    mouseInfo: MouseInfo,
    targetMeasure: Measure | null,
    targetNextMeasure: Measure | null,
    targetMeasureDivision: number,
    targetNotePoint: NotePointInfo | null = null,
    setCursor: (value: string) => void,
    cancelRangeSelection: () => void,
    lineInfos: NoteLineInfo[]
  ): UpdateResult {
    const { musicGameSystem } = chart;
    const { isClick, isLeftPressing, isMouseRightPressed } = mouseInfo;
    const mousePosition = mouseInfo.position;

    let selectTargets: TimelineObject[] | null = null;

    let isMouseOnNote = false;

    const { setting } = this.editor;

    // 可視レイヤーの GUID
    const visibleLayers = new Set(
      chart.layers.filter((layer) => layer.visible).map((layer) => layer.guid)
    );

    // ノート描画
    for (const note of chart.timeline.notes) {
      const measure = chart.timeline.measures[note.measureIndex];

      // 小節とレイヤーが表示されているなら描画する
      note.isVisible = measure.isVisible && visibleLayers.has(note.layer);

      if (!note.isVisible) continue;

      NoteRendererResolver.resolve(note).render(note, this.graphics);

      const bounds = note.getBounds();
      if (!bounds.contains(mousePosition.x, mousePosition.y)) continue;
      isMouseOnNote = true;

      let canDrag = false;
      let canWResize = false;
      let canEResize = false;

      if (canEdit && setting.editMode === EditMode.Select) {
        canDrag = true;
        setCursor("move");

        if (Math.abs(bounds.x - mousePosition.x) < 8) {
          canWResize = true;
          setCursor("w-resize");
        }
        if (Math.abs(bounds.x + bounds.width - mousePosition.x) < 8) {
          canEResize = true;
          setCursor("e-resize");
        }
      }

      if (
        canEdit &&
        (setting.editMode === EditMode.Select ||
          setting.editMode === EditMode.Delete)
      ) {
        selectTargets = [note];

        // ドラッグ判定
        if (isLeftPressing && canDrag) {
          if (canWResize) {
            this.wResizeNoteInfo = new NoteResizeInfo(
              note,
              new Vector2(
                bounds.x - mousePosition.x,
                bounds.y - mousePosition.y
              )
            );
          } else if (canEResize) {
            this.eResizeNoteInfo = new NoteResizeInfo(
              note,
              new Vector2(
                bounds.x - mousePosition.x,
                bounds.y - mousePosition.y
              )
            );
          } else {
            this.dragTargetNote = note;
            this.dragTargetNotePressPositionDiff = new Vector2(
              bounds.x - mousePosition.x,
              bounds.y - mousePosition.y
            );
          }
          cancelRangeSelection();
        }

        if (isClick) {
          if (setting.editMode === EditMode.Delete) {
            chart.timeline.removeNote(note);
            chart.save();
          }
        }

        if (isMouseRightPressed) {
          cancelRangeSelection();
          chart.timeline.removeNote(note);
          chart.save();
        }
      }

      // ノート接続
      if (setting.editMode === EditMode.Connect) {
        this.graphics
          .lineStyle(2, 0xff9900)
          .drawRect(bounds.x, bounds.y, bounds.width, bounds.height);

        if (
          this.connectTargetNote &&
          NoteController.canConnect(
            musicGameSystem,
            this.connectTargetNote,
            note
          )
        ) {
          const [head, tail] = [this.connectTargetNote!, note!].sort(
            sortMeasureData
          );

          const newNoteLine = NoteLineRecord.new({
            guid: guid(),
            head: head.guid,
            tail: tail.guid,
            centerNotes: [],
            bezier: {
              enabled: false,
              x: 1,
              y: 0.5,
            },
          });

          // ノートラインプレビュー
          NoteLineRendererResolver.resolve(newNoteLine).render(
            newNoteLine,
            this.graphics,
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

    // 接続モードじゃないかノート外をタップしたら接続対象ノートを解除
    if (setting.editMode !== EditMode.Connect || (isClick && !isMouseOnNote)) {
      this.connectTargetNote = null;
    }

    if (canEdit && targetMeasure && targetNextMeasure) {
      this.dragAndResize(
        chart,
        targetMeasure,
        targetNextMeasure,
        mousePosition,
        targetMeasureDivision
      );
    }

    // レーン選択中ならノートを配置する
    if (
      canEdit &&
      targetMeasure &&
      targetNotePoint &&
      setting.editMode === EditMode.Add &&
      setting.editObjectCategory === ObjectCategory.Note
    ) {
      this.add(
        chart,
        mouseInfo,
        targetMeasureDivision,
        targetNotePoint,
        lineInfos
      );
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

      this.graphics
        .lineStyle(2, 0xff9900)
        .drawRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }

    return { selectTargets };
  }

  private add(
    chart: Chart,
    mouseInfo: MouseInfo,
    targetMeasureDivision: number,
    targetNotePoint: NotePointInfo,
    lineInfos: NoteLineInfo[]
  ) {
    const { setting } = this.editor;
    const { musicGameSystem } = chart;
    const { isClick } = mouseInfo;
    const newNoteType = musicGameSystem.noteTypes[setting.editNoteTypeIndex];

    // 新規ノート
    const newNote = NoteRecord.new(
      {
        guid: guid(),
        horizontalSize: setting.objectSize,
        horizontalPosition: new Fraction(
          targetNotePoint!.horizontalIndex,
          targetNotePoint!.lane.division
        ),
        measureIndex: targetNotePoint.measureIndex,
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

      if (NoteController.canConnect(musicGameSystem, head, tail)) {
        // ノートラインプレビュー
        NoteLineRendererResolver.resolveByNoteType(head.type).renderByNote(
          head,
          tail,
          NoteLineRecord.new({
            guid: guid(),
            head: head.guid,
            tail: tail.guid,
            centerNotes: [],
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

      // ノートラインに挿入
      const { isOverlap, targetNoteLine } = this.checkNoteLineOverlap(
        newNote,
        lineInfos,
        true
      );
      console.log(isOverlap, targetNoteLine);
      if (isOverlap && targetNoteLine) {
        console.log("挿入！");

        chart.timeline.removeNoteLine(targetNoteLine);

        chart.timeline.addNoteLine(
          NoteLineRecord.new({
            guid: guid(),
            head: targetNoteLine.head,
            tail: newNote.guid,
            centerNotes: [],
            bezier: {
              enabled: targetNoteLine.bezier.enabled,
              x: targetNoteLine.bezier.x,
              y: targetNoteLine.bezier.y,
            },
          })
        );

        chart.timeline.addNoteLine(
          NoteLineRecord.new({
            guid: guid(),
            head: newNote.guid,
            tail: targetNoteLine.tail,
            centerNotes: [],
            bezier: {
              enabled: targetNoteLine.bezier.enabled,
              x: targetNoteLine.bezier.x,
              y: targetNoteLine.bezier.y,
            },
          })
        );

        chart.save();
      }

      // 接続
      const head = previouslyCreatedNote;
      const tail = newNote;

      if (
        setting.isPressingModKey &&
        head &&
        NoteController.canConnect(musicGameSystem, head, tail)
      ) {
        const newNoteLine = NoteLineRecord.new({
          guid: guid(),
          head: head.guid,
          tail: tail.guid,
          centerNotes: [],
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
      NoteRendererResolver.resolve(newNote).render(newNote, this.graphics);

      // ノートラインに重なっているかチェック
      this.checkNoteLineOverlap(newNote, lineInfos, false);
    }
  }

  private checkNoteLineOverlap(
    note: Note,
    lineInfos: NoteLineInfo[],
    updateNoteBounds: boolean
  ): {
    isOverlap: boolean;
    targetNoteLine?: NoteLine;
  } {
    // ノーツの領域を更新しないと正常に判定できない
    if (updateNoteBounds) {
      note.updateBounds();
    }

    for (let x = 0; x < note.horizontalSize + 1; x++) {
      // ラインの横に配置した際に重なった判定にならないようにする
      const adjustX = x === 0 ? 1 : x === note.horizontalSize ? -1 : 0;

      const pos = new Vector2(
        note.x + (note.width / note.horizontalSize) * x + adjustX,
        note.y + note.height / 2
      );

      const { isOverlap, targetNoteLineInfo: line } = new NoteLineRenderInfo(
        lineInfos
      ).overlap(pos, note.measureIndex);

      if (isOverlap && line) {
        // 重なっていたら対象のノートラインに線を引く
        const t = inverseLerp(line.start.point.y, line.end.point.y, pos.y);
        const startX = lerp(line.start.point.x, line.end.point.x, t);
        const endX = startX + lerp(line.start.width, line.end.width, t);

        this.graphics
          .lineStyle(1, 0x00ff00)
          .moveTo(startX, pos.y)
          .lineTo(endX, pos.y);

        return { isOverlap: true, targetNoteLine: line.noteLine };
      }

      // preview
      // this.graphics.beginFill(0xff0000ff).drawCircle(pos.x, pos.y, 4).endFill();
    }
    return { isOverlap: false };
  }
}
