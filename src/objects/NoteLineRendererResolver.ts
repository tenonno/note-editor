import Pixi from "../containers/Pixi";
import { NoteLine } from "./NoteLine";
import NoteLineRenderer, { INoteLineRenderer } from "./NoteLineRenderer";

export default class NoteLineRendererResolver {
  public static resolveByNoteType(noteType: string): INoteLineRenderer {
    const customRenderer = Pixi.instance!.injected.editor!.currentChart!.musicGameSystem.customNoteLineRendererMap.get(
      noteType
    );

    if (!customRenderer) return NoteLineRenderer;

    if (customRenderer.rendererReference) {
      return {
        customRender: customRenderer.rendererReference as any,
        render: NoteLineRenderer.render,
        renderByNote: NoteLineRenderer.renderByNote,
      };
    } else return NoteLineRenderer;
  }

  public static resolve(noteLine: NoteLine): INoteLineRenderer {
    const headNote = Pixi.instance!.injected.editor!.currentChart!.timeline.noteMap.get(
      noteLine.head
    )!;
    return this.resolveByNoteType(headNote.type);
  }
}
