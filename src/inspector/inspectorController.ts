export default interface InspectorController {
  mount(element: HTMLElement): void;
  bind(targets: any): void;
  reset(): void;
  setActive(value: boolean): void;
  addCustomButton(name: string, onClick: any): void;
  resetCustomButton(): void;
}

export type InspectorConfigSplitValue = {
  key: string;
  labels: string[];

  /**
   * labels に x, y が含まれていた場合のラベル
   */
  pointLabel: string;
  pointParams?: any;
};

export type InspectorConfig = {
  splitValues: InspectorConfigSplitValue[];
};
