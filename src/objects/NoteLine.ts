import { Record } from "immutable";
import { Mutable } from "src/utils/mutable";
import { GUID, guid } from "../utils/guid";

export type NoteLineData = {
  guid: GUID;
  head: GUID;
  tail: GUID;
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
  bezier: {
    enabled: false,
    x: 1,
    y: 0.5,
  },
};

export type NoteLine = Mutable<NoteLineRecord>;

export class NoteLineRecord extends Record<NoteLineData>(defaultNoteLineData) {
  static new(data: NoteLineData): NoteLine {
    return new NoteLineRecord(data).asMutable();
  }

  private constructor(data: NoteLineData) {
    super(
      (() => {
        if (data.guid === "") data.guid = guid();
        if (data.bezier.x === undefined) {
          data.bezier.x = 1;
        }
        if (data.bezier.y === undefined) {
          data.bezier.y = 0.5;
        }
        if (!data.bezier === null) {
          data.bezier = {
            enabled: false,
            x: 1,
            y: 0.5,
          };
        }
        return data;
      })()
    );
  }

  isVisible = false;

  x = 0;
  y = 0;
  width = 0;
  height = 0;
}
