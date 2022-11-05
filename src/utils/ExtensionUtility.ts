import * as fs from "fs";
import { Fraction, inverseLerp, lerp, Vector2 } from "../math";
import { sortMeasure } from "../objects/Measure";
import { NoteRecord } from "../objects/Note";
import Editor from "../stores/EditorStore";
import { guid } from "./guid";
import { BezierNoteLineCalculator } from "./bezierNoteLineCalculator";
import { TsGoogleDrive } from "ts-google-drive";
import { google } from "googleapis";

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

  BezierNoteLineCalculator = BezierNoteLineCalculator;
  TsGoogleDrive = TsGoogleDrive;
  google = google;
}

export default new ExtensionUtility();
