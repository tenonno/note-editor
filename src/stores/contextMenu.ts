import { ipcRenderer } from "electron";
import { NoteLine } from "../objects/NoteLine";
import Chart from "./Chart";

export class NoteLineContextMenu {
  private noteLine?: NoteLine;
  private chart?: Chart;

  public constructor() {
    ipcRenderer.on("deleteNoteLine", (_, value) => {
      this.delete();
    });

    ipcRenderer.on("setBezier", (_, value) => {
      this.setBezier(value);
    });
  }

  public delete() {
    this.chart!.timeline.removeNoteLine(this.noteLine!);
    this.chart!.timeline.save();
  }

  public setBezier(enabled: boolean) {
    this.noteLine!.bezier.enabled = enabled;
    this.chart!.timeline.save();
  }

  public show(noteLine: NoteLine, chart: Chart) {
    this.noteLine = noteLine;
    this.chart = chart;

    ipcRenderer.send("showNoteLineContextMenu", noteLine.bezier.enabled);
  }
}
