import * as PIXI from "pixi.js";

export default interface TimelineObject {
  drawBounds(graphics: PIXI.Graphics, rgba: number): void;

  isSelected: boolean;
}

export interface IRangeSelectableTimelineObject {
  getBounds(): PIXI.Rectangle;
}
