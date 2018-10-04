export interface LaneTemplate {
  name: string;
  color: string;
  division: number;
  renderer: string;
  rendererReference: Function;
}

/**
 * 初期レーン情報
 */
interface InitialLane {
  template: string;
  horizontalSize: number;
  horizontalPosition: number;
}

export interface NoteType {
  name: string;
  color: string;
  renderer: string;
  rendererReference: any;
  excludeLanes: string[];
}

export interface CustomNoteLineRenderer {
  target: string;
  renderer: string;
  rendererReference: any;
}

interface MusicGameSystem {
  name: string;
  version: number;
  laneTemplates: LaneTemplate[];

  laneTemplateMap: Map<string, LaneTemplate>;

  initialLanes: InitialLane[];
  measureHorizontalDivision: number;
  noteTypes: NoteType[];

  noteTypeMap: Map<string, NoteType>;

  customNoteLineRenderers: CustomNoteLineRenderer[];

  customNoteLineRendererMap: Map<string, CustomNoteLineRenderer>;
}

export function normalizeMusicGameSystem(
  musicGameSystem: any
): MusicGameSystem {
  return Object.assign(
    {
      initialLanes: [],
      laneTemplates: [],
      customNoteLineRenderers: []
    },
    musicGameSystem
  );
}

export default MusicGameSystem;
