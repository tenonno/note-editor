export default interface InspectorController {
  mount(element: HTMLElement): void;
  bind(targets: any): void;
  reset(): void;
  setActive(value: boolean): void;
  addCustomButton(name: string, onClick: any): void;
  resetCustomButton(): void;
}
