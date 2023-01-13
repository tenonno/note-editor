import { ipcRenderer } from "electron";
import { CurveType, NoteLine } from "../objects/NoteLine";
import Chart from "./Chart";

export class NoteLineContextMenu {
  private noteLine?: NoteLine;
  private chart?: Chart;

  public constructor() {
    ipcRenderer.on("deleteNoteLine", (_, value) => {
      this.delete();
    });

    ipcRenderer.on("setCurveType", (_, value) => {
      this.setCurveType(value);
    });
  }

  public delete() {
    this.chart!.timeline.removeNoteLine(this.noteLine!);
    this.chart!.timeline.save();
  }

  public setCurveType(type: CurveType) {
    this.noteLine!.curve.type = type;
    this.chart!.timeline.save();
  }

  public show(noteLine: NoteLine, chart: Chart) {
    this.noteLine = noteLine;
    this.chart = chart;

    ipcRenderer.send("showNoteLineContextMenu", noteLine.curve.type, Object.values(CurveType));
  }
}
