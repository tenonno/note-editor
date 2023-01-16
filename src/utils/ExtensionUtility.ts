import * as fs from "fs";
import { Fraction, inverseLerp, lerp, Vector2 } from "../math";
import { sortMeasure } from "../objects/Measure";
import { NoteRecord } from "../objects/Note";
import Editor from "../stores/EditorStore";
import { guid } from "./guid";
import { createNoteLineCalculator, getLanePoints } from "./noteLineUtility";
import { TsGoogleDrive } from "ts-google-drive";
import { google } from "googleapis";
import { NoteLine } from "src/objects/NoteLine";
import Chart from "src/stores/Chart";

export class ExtensionUtility {
  Vector2 = Vector2;
  lerp = lerp;
  inverseLerp = inverseLerp;
  NoteRecord = NoteRecord;
  guid = guid;
  Fraction = Fraction;
  fs = fs;
  sortMeasure = sortMeasure;

  getEditor() {
    return Editor.instance!;
  }

  createNoteLineCalculator(noteLine: NoteLine, chart: Chart) {
    return createNoteLineCalculator(noteLine, getLanePoints(noteLine, chart), chart.timeline.measures);
  }

  TsGoogleDrive = TsGoogleDrive;
  google = google;
}

export default new ExtensionUtility();
