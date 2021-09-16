import {
  InspectorConfig,
  InspectorConfigSplitValue,
} from "./inspectorController";
import Tweakpane from "tweakpane";
import { FolderApi } from "tweakpane/dist/types/api/folder";
import { isString } from "lodash";
import { InputBindingApi } from "tweakpane/dist/types/api/input-binding";
import { Color } from "tweakpane/dist/types/model/color";
import { Point2d } from "tweakpane/dist/types/model/point-2d";
import { InputtableOutType } from "tweakpane/dist/types/controller/binding-creators/input";

export class TweakpaneSplitValueController {
  private splitValueKeys: Map<string, InspectorConfigSplitValue>;

  public constructor(inspectorConfig: InspectorConfig | {}) {
    this.splitValueKeys = new Map<string, InspectorConfigSplitValue>(
      (
        ((inspectorConfig as InspectorConfig)?.splitValues as any[]) ?? []
      ).map((splitValue) => [splitValue.key, splitValue])
    );
  }

  public isSplitValue(key: string) {
    return this.splitValueKeys.has(key);
  }

  public addInput(gui: Tweakpane | FolderApi, parent: any, key: string) {
    const splitValue = this.splitValueKeys.get(key)!;

    if (!isString(parent[key])) {
      parent[key] = parent[key].toString();
    }

    if (
      splitValue.labels.length - 1 !==
      Array.from(parent[key].matchAll(",")).length
    ) {
      console.warn(
        "分割数が異なっています",
        splitValue.labels.length - 1,
        parent[key],
        parent[key].matchAll(",").length
      );
      parent[key] = Array.from({
        length: splitValue.labels.length,
      }).join(",");
    }

    const ret: InputBindingApi<
      string | number | boolean | Color | Point2d,
      InputtableOutType
    >[] = [];

    const hasPoint =
      splitValue.labels.includes("x") && splitValue.labels.includes("y");

    for (let i = 0; i < splitValue.labels.length; i++) {
      let label = splitValue.labels[i];

      if (!parent.hasOwnProperty(label)) {
        Object.defineProperty(parent, label, {
          get: () => parent[key].split(",")[i],
          set(value: any) {
            const values = parent[key].split(",");
            values[i] = value;
            parent[key] = values.join(",");
          },
        });
      }

      if (hasPoint && (label === "x" || label === "y")) {
        continue;
      }

      const newController = gui.addInput(parent, label);
      ret.push(newController);
    }

    if (hasPoint) {
      if (!parent.hasOwnProperty(splitValue.pointLabel)) {
        Object.defineProperty(parent, splitValue.pointLabel, {
          get: () => ({ x: parent.x * 1, y: parent.y * 1 }),
          set(value: Point2d) {
            parent.x = value.x;
            parent.y = value.y;
          },
        });
      }

      const newController = gui.addInput(
        parent,
        splitValue.pointLabel,
        splitValue.pointParams
      );
      ret.push(newController);
    }

    return ret;
  }
}
