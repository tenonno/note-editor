import Tweakpane from "tweakpane";
import { ButtonApi } from "tweakpane/dist/types/api/button";
import { ComponentApi } from "tweakpane/dist/types/api/component-api";
import { FolderApi } from "tweakpane/dist/types/api/folder";
import Editor from "../stores/EditorStore";
import InspectorController from "./inspectorController";
import { TweakpaneSplitValueController } from "./tweakpaneSplitValueController";
import { InspectorPointValue } from "../objects/OtherObject";

export default class TweakpaneInspectorController
  implements InspectorController {
  private pane?: Tweakpane;
  private components: ComponentApi[] = [];

  private customButtons: ButtonApi[] = [];

  public constructor(private editor: Editor) {}

  public getWarnings(): string[] {
    return [];
  }

  public mount(element: HTMLElement): void {
    this.pane = new Tweakpane({
      container: element,
      title: "Inspector",
    });
  }

  public bind(targets: any) {
    const isPoint = (object: any) => {
      const keys = Object.keys(object);
      return keys.includes("x") && keys.includes("y");
    };

    // プロパティを追加する
    const add = (gui: Tweakpane | FolderApi, _obj: any, parent: any) => {
      const obj = _obj.toJS ? _obj.toJS() : _obj;

      const config = obj.inspectorConfig || {};
      const ignoreKeys = config.ignoreKeys || [];

      if (_obj.inspectorTargetKeys) {
        for (const key of _obj.inspectorTargetKeys) {
          obj[key] = _obj[key];
        }
      }

      /*
      config["guid"] = Object.assign(config["guid"], {
        disabled: true,
      });
      */

      const splitValueController = new TweakpaneSplitValueController(config);

      for (const key of Object.keys(obj)) {
        if (key === "inspectorConfig") continue;
        if (ignoreKeys.includes(key)) continue;

        if (obj[key] instanceof InspectorPointValue) {
          const point = obj[key] as InspectorPointValue;

          console.log(obj[key]);
          const newController = gui.addInput(
            {
              value: { x: point.x, y: point.y },
            },
            "value",
            { ...config[key], ...point.option }
          );
          newController.on("change", ({ x, y }) => {
            point.set(x, y);
          });
          this.components.push(newController);
          continue;
        }

        // オブジェクトなら再帰
        if (obj[key] instanceof Object) {
          const folder = gui.addFolder({ title: key });
          add(folder, obj[key], parent[key]);
          this.components.push(folder);
          continue;
        }

        if (splitValueController.isSplitValue(key)) {
          const inputs = splitValueController.addInput(gui, parent, key);
          this.components.push(...inputs);
          continue;
        }

        let newController: any;

        const isColor = obj[key].toString().match(/^#[0-9A-F]{6}$/i);

        if (isColor) {
          // 数値形式なら #nnnnnn 形式の文字列にする
          if (typeof obj[key] === "number") {
            obj[key] = "#" + obj[key].toString(16).padStart(6, "0");
          } else {
            obj[key] = obj[key].replace("0x", "#");
          }

          newController = gui.addInput(obj, key);
        } else {
          newController = gui.addInput(obj, key, config[key]);
        }

        this.components.push(newController);

        newController.on("change", (value: any) => {
          if (parent.setValue) {
            parent.setValue(key, value);
          } else {
            parent[key] = value;
          }

          // TODO: 特定のオブジェクトの場合だけ時間を更新するようにする
          this.editor.currentChart!.timeline.calculateTime();
          this.editor.currentChart!.save();
        });
      }

      /*
      if (config?.splitValues) {
        for (const splitValue of config?.splitValues as any[]) {
          console.warn(splitValue);
        }
      }
      */
    };

    add(
      this.pane!,
      targets.length === 1 ? targets[0] : targets,
      targets.length === 1 ? targets[0] : targets
    );
  }

  public reset() {
    for (const obj of this.components) {
      obj.dispose();
    }
  }

  public setActive(value: boolean): void {
    if (!this.pane) return;

    this.pane.element.style.display = value ? "block" : "none";
  }

  public addCustomButton(name: string, onClick: any): void {
    if (!this.pane) return;

    const button = this.pane.addButton({
      title: name,
    });
    button.on("click", onClick);
    this.customButtons.push(button);
  }

  public resetCustomButton(): void {
    for (const button of this.customButtons) {
      button.dispose();
    }
    this.customButtons = [];
  }
}
