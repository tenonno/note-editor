import * as fs from "fs";
import { Fraction, inverseLerp, lerp, Vector2 } from "../math";
import { sortMeasure } from "../objects/Measure";
import { NoteRecord } from "../objects/Note";
import Editor from "../stores/EditorStore";
import { guid } from "./guid";
import { BezierNoteLineCalculator } from "./bezierNoteLineCalculator";

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
}

export default new ExtensionUtility();
