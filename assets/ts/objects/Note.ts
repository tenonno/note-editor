import { Fraction, IFraction } from "../math";
import GraphicObject from "./GraphicObject";
import { GUID } from "../util";
import { observable } from "mobx";

interface INoteEditorProps {
  time: number;

  color: number;
  sePlayed: boolean;
}

export interface INoteData {
  editorProps: INoteEditorProps;

  guid: GUID;

  /**
   * 小節インデックス
   */
  measureIndex: number;
  /**
   * 小節内の位置
   */
  measurePosition: IFraction;

  horizontalSize: number;
  horizontalPosition: Fraction;

  type: string;

  /**
   * 所属レーンの GUID
   */
  lane: GUID;

  customProps: any;
}

export default class Note extends GraphicObject {
  @observable
  data: INoteData;

  constructor(data: INoteData) {
    super();
    this.data = data;
  }
}
