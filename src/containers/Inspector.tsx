import _ from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import DatGuiInspectorController from "../inspector/datGuiInspectorController";
import InspectorController from "../inspector/inspectorController";
import TweakpaneInspectorController from "../inspector/tweakpaneInspectorController";
import Editor from "../stores/EditorStore";
import { inject, InjectedComponent } from "../stores/inject";
import guiUtil from "../utils/GuiUtility";

/**
 * インスペクタコンポーネント
 */
@inject
@observer
export default class Inspector extends InjectedComponent {
  private element?: HTMLDivElement;

  private currentObjects: any[] = [];

  private readonly maxTargetCount = 5;

  private controllers: InspectorController[] = [
    new TweakpaneInspectorController(this.injected.editor),
    new DatGuiInspectorController(this.injected.editor)
  ];

  private currentInspectorIndex = 0;

  private get currentInspectorController() {
    return this.controllers[this.currentInspectorIndex];
  }

  /**
   * オブジェクトをインスペクタにバインドする
   */
  private bind(targets: any[]) {
    if (targets.length >= this.maxTargetCount) {
      this.currentInspectorController.reset();
      return;
    }

    // 今表示しているものと完全に一致したら更新しない
    if (
      _.difference(targets, this.currentObjects).length == 0 &&
      _.difference(this.currentObjects, targets).length == 0
    ) {
      return;
    }
    this.currentObjects = targets;

    this.currentInspectorController.reset();

    // onRenderInspector
    if (
      this.injected.editor.currentChart! &&
      this.injected.editor.currentChart!.musicGameSystem
    ) {
      const onRenderInspector = this.injected.editor.currentChart!
        .musicGameSystem.eventListeners.onRenderInspector;
      if (onRenderInspector)
        onRenderInspector(Editor.instance!.currentChart!, guiUtil);
    }

    this.currentInspectorController.bind(targets);
  }

  private updateIndex(index: number, forceUpdate = false) {
    if (this.currentInspectorIndex == index && !forceUpdate) return;

    for (let i = 0; i < this.controllers.length; i++) {
      this.controllers[i].reset();
      this.controllers[i].setActive(i === index);
    }

    this.currentInspectorIndex = index;
    guiUtil.inspectorController = this.currentInspectorController;
  }

  componentDidMount() {
    for (const controller of this.controllers) {
      controller.mount(this.element!);
    }
    this.updateIndex(this.currentInspectorIndex, true);
  }

  render() {
    const targets = this.injected.editor.inspectorTargets;
    this.updateIndex(this.injected.editor.setting.currentInspectorIndex);
    this.bind(targets);

    let component = this;
    return (
      <div>
        <div
          ref={thisDiv => {
            component.element = thisDiv!;
          }}
        />
        {targets.length >= this.maxTargetCount ? (
          <span>{targets.length}個のオブジェクトを選択しています</span>
        ) : null}
      </div>
    );
  }
}
