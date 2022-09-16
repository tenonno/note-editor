import { Application, Graphics, Point, Rectangle } from "pixi.js";
import { clone } from "lodash";

export default class MouseInfo {
  private previousMouseButtons: number = 0;

  public position = new Point(0, 0);
  public isLeftPressing = false;
  public isLeftPressed = false;
  public isMouseRightPressed = false;
  public isClick = false;
  public isRightClick = false;

  public update(app: Application, graphics: Graphics) {
    const buttons = app.renderer.plugins.interaction.mouse.buttons;
    const viewRect = app.view.getBoundingClientRect();

    let isClick = this.previousMouseButtons === 1 && buttons === 0;
    let isRightClick = this.previousMouseButtons === 2 && buttons === 0;
    const isMouseRightPressed = buttons === 2;
    const isLeftPressed = buttons === 1;
    const isMouseLeftPressing =
      this.previousMouseButtons === 0 && buttons === 1;

    const mousePosition = clone(app.renderer.plugins.interaction.mouse.global);

    // 範囲外ならクリックしていないことにする
    if (
      !new Rectangle(0, 0, viewRect.width, viewRect.height).contains(
        mousePosition.x,
        mousePosition.y
      )
    ) {
      isClick = false;
      isRightClick = false;
    }
    mousePosition.x -= graphics.x;

    this.previousMouseButtons = buttons;

    this.position = mousePosition;
    this.isClick = isClick;
    this.isRightClick = isRightClick;
    this.isLeftPressing = isMouseLeftPressing;
    this.isLeftPressed = isLeftPressed;
    this.isMouseRightPressed = isMouseRightPressed;
  }
}
