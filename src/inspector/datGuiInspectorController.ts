import { GUI, GUIController } from "dat.gui";
import config from "../config";
import Editor from "../stores/EditorStore";
import InspectorController from "./inspectorController";

/**
 * フォルダを削除する GUI#removeFolder を定義
 */
Object.defineProperty(GUI.prototype, "removeFolder", {
  value(targetFolder: GUI) {
    const { name } = targetFolder;
    const folder = this.__folders[name];
    if (!folder) return;
    folder.close();
    this.__ul.removeChild(folder.domElement.parentNode);
    delete this.__folders[name];
    this.onResize();
  },
});

export default class DatGuiInspectorController implements InspectorController {
  private gui = new GUI({ autoPlace: false });
  private folders: GUI[] = [];
  private controllers: GUIController[] = [];
  private guiScale = 1.2;

  private customButtons: GUIController[] = [];

  public constructor(private editor: Editor) {}

  public mount(element: HTMLElement): void {
    const gui = this.gui;
    const size = config.sidebarWidth;
    const scale = this.guiScale;

    gui.domElement.querySelector(".close-button")!.remove();

    (window as any).GUI = GUI;

    // インスペクタの領域を調整する
    new MutationObserver((_) => {
      const w = gui.domElement.offsetWidth;
      const h = gui.domElement.offsetHeight;
      gui.domElement.style.transform = `scale(${scale})`;

      gui.width = size * (1 / scale);

      gui.domElement.style.marginLeft = `${(w * scale - w) / 2}px`;
      gui.domElement.style.marginTop = `${(h * scale - h) / 2}px`;
      gui.domElement.style.marginBottom = `${(h * scale - h) / 2}px`;
    }).observe(gui.domElement, { attributes: true, subtree: true });

    element.appendChild(gui.domElement);
  }

  public bind(targets: any) {
    // プロパティを追加する
    const add = (gui: GUI, obj: any, parent: any) => {
      if (obj.toJS) {
        obj = obj.toJS();
      }

      const config = obj.inspectorConfig || {};

      for (const key of Object.keys(obj)) {
        if (key == "inspectorConfig") continue;

        // オブジェクトなら再帰
        if (obj[key] instanceof Object) {
          const folder = gui.addFolder(key);
          this.folders.push(folder);
          add(folder, obj[key], parent[key]);
          folder.open();
          continue;
        }

        let newController: GUIController | null = null;

        const isColor = obj[key].toString().match(/^#[0-9A-F]{6}$/i);

        if (isColor) {
          // 数値形式なら #nnnnnn 形式の文字列にする
          if (typeof obj[key] === "number") {
            obj[key] = "#" + obj[key].toString(16).padStart(6, "0");
          } else {
            obj[key] = obj[key].replace("0x", "#");
          }

          newController = gui.addColor(obj, key);
        } else {
          newController = gui.add(obj, key);
        }

        // configの適用
        if (config[key]) {
          for (const method of Object.keys(config[key])) {
            newController = (newController as any)[method](
              config[key][method]
            ) as GUIController;
          }
        }

        // 値の反映
        newController.onChange((value: any) => {
          if (parent.setValue) {
            parent.setValue(key, value);
          } else {
            parent[key] = value;
          }
        });

        // 値を更新したら保存
        newController.onFinishChange(() => {
          // TODO: 特定のオブジェクトの場合だけ時間を更新するようにする
          this.editor.currentChart!.timeline.calculateTime();
          this.editor.currentChart!.save();
        });

        if (gui === this.gui) {
          this.controllers.push(newController);
        }
      }
    };

    add(
      this.gui,
      targets.length === 1 ? targets[0] : targets,
      targets.length === 1 ? targets[0] : targets
    );
  }

  public reset() {
    // 既存のコントローラーを削除する
    for (const controller of this.controllers) {
      this.gui.remove(controller);
    }

    // 既存のフォルダを削除する
    for (const folder of this.folders) (this.gui as any).removeFolder(folder);

    this.controllers = [];
    this.folders = [];
  }

  public setActive(value: boolean): void {
    this.gui.domElement.style.display = value ? "block" : "none";
  }

  public addCustomButton(name: string, onClick: any): void {
    this.customButtons.push(
      this.gui.add(
        {
          [name]: onClick,
        },
        name
      )
    );
  }

  public resetCustomButton(): void {
    for (const button of this.customButtons) {
      this.gui.remove(button);
    }
    this.customButtons = [];
  }
}
