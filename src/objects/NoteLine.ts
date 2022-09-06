import { Record } from "immutable";
import { Mutable } from "src/utils/mutable";
import { GUID, guid } from "../utils/guid";
import TimelineObject from "./TimelineObject";
import { Graphics } from "pixi.js";
import { NoteLineInfo } from "./Lane";
import { parseRgba } from "../utils/color";

export type NoteLineData = {
  guid: GUID;
  head: GUID;
  tail: GUID;
  centerNotes: GUID[];
  bezier: {
    enabled: boolean;
    x: number;
    y: number;
  };
};

const defaultNoteLineData: NoteLineData = {
  guid: "GUID",
  head: "GUID",
  tail: "GUID",
  centerNotes: [],
  bezier: {
    enabled: false,
    x: 1,
    y: 0.5,
  },
};

export type NoteLine = Mutable<NoteLineRecord>;

export class NoteLineRecord
  extends Record<NoteLineData>(defaultNoteLineData)
  implements TimelineObject {
  static new(data: NoteLineData): NoteLine {
    return new NoteLineRecord(data).asMutable();
  }

  private constructor(data: NoteLineData) {
    super(
      (() => {
        if (data.guid === "") data.guid = guid();
        if (!data.centerNotes) data.centerNotes = [];
        return data;
      })()
    );
  }

  isVisible = false;

  x = 0;
  y = 0;
  width = 0;
  height = 0;

  public isSelected = false;

  private infos: NoteLineInfo[] = [];

  public setRenderResult(infos: NoteLineInfo[]) {
    this.infos = infos;
  }

  public drawBounds(graphics: Graphics, rgba: number): void {
    for (const line of this.infos) {
      const { color, alpha } = parseRgba(rgba);

      // 左右の線
      graphics
        .lineStyle(2, color, alpha)
        .moveTo(line.start.point.x, line.start.point.y)
        .lineTo(line.end.point.x, line.end.point.y);
      graphics
        .lineStyle(2, color, alpha)
        .moveTo(line.start.point.x + line.start.width, line.start.point.y)
        .lineTo(line.end.point.x + line.end.width, line.end.point.y);
    }
  }
}
