import Tweakpane from "tweakpane";
import { ButtonApi } from "tweakpane/dist/types/api/button";
import { ComponentApi } from "tweakpane/dist/types/api/component-api";
import { FolderApi } from "tweakpane/dist/types/api/folder";
import Editor from "../stores/EditorStore";
import InspectorController from "./inspectorController";

export default class TweakpaneInspectorController
  implements InspectorController {
  private pane?: Tweakpane;
  private components: ComponentApi[] = [];

  private customButtons: ButtonApi[] = [];

  public constructor(private editor: Editor) {}

  public mount(element: HTMLElement): void {
    this.pane = new Tweakpane({
      container: element,
      title: "Inspector",
    });
  }

  public bind(targets: any) {
    // プロパティを追加する
    const add = (gui: Tweakpane | FolderApi, obj: any, parent: any) => {
      if (obj.toJS) {
        obj = obj.toJS();
      }

      const config = obj.inspectorConfig || {};

      for (const key of Object.keys(obj)) {
        if (key == "inspectorConfig") continue;

        // オブジェクトなら再帰
        if (obj[key] instanceof Object) {
          const folder = gui.addFolder({ title: key });
          add(folder, obj[key], parent[key]);
          this.components.push(folder);
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
