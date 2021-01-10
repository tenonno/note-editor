import InspectorController from "../inspector/inspectorController";

export class GuiUtility {
  public inspectorController?: InspectorController;

  public update() {
    this.inspectorController?.resetCustomButton();
  }

  public addButton(name: string, onClick: any) {
    this.inspectorController?.addCustomButton(name, onClick);
  }
}

export default new GuiUtility();
