import { Record } from "immutable";
import { GUID } from "../utils/guid";
import { Mutable } from "../utils/mutable";

export type LayerData = {
  guid: GUID;
  name: string;
  visible: boolean;
  lock: boolean;
  group: number;
};

const defaultLayerData: LayerData = {
  guid: "",
  name: "",
  visible: true,
  lock: false,
  group: 1,
};

export type Layer = Mutable<LayerRecord>;

export class LayerRecord extends Record<LayerData>(defaultLayerData) {
  static new(data: LayerData): Layer {
    return new LayerRecord(data).asMutable();
  }

  private constructor(data: LayerData) {
    super(data);
  }
}
