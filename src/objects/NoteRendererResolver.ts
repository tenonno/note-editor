import INote from "./Note";
import NoteRenderer, { INoteRenderer } from "./NoteRenderer";
import Pixi from "../containers/Pixi";

export default class NoteRendererResolver {
  private static renderers = new WeakMap<any, any>();

  static resolve(note: INote): INoteRenderer {
    const noteType = Pixi.instance!.injected.editor!.currentChart!.musicGameSystem!.noteTypeMap.get(
      note.data.type
    )!;

    // デフォルトレンダラー
    if (noteType.renderer === "default") return NoteRenderer;

    // レンダラー作成済み
    if (this.renderers.has(noteType.rendererReference)) {
      return this.renderers.get(noteType.rendererReference);
    } else if (noteType.rendererReference) {
      // レンダラー作成
      const renderer = {
        getBounds: NoteRenderer.getBounds,
        render: NoteRenderer.render,
        customRender: noteType.rendererReference
      };
      this.renderers.set(noteType.rendererReference, renderer);
      return renderer;
    } else return NoteRenderer;
  }
}