import { OtherObjectData } from "../objects/OtherObject";
import { ChartJsonData } from "../stores/Chart";

/**
 * 譜面のバージョンを更新する
 * @param chart 譜面
 * @param currentVersion 現在のバージョン
 */
export default function updateChart(
  chart: ChartJsonData,
  currentVersion: number
) {
  chart.version = parseInt(chart.version.toString());

  if (chart.version < currentVersion) {
    console.warn("譜面フォーマットをアップデートします。");
  }

  // BPM変更と速度変更をOtherObjectsに統合
  if (chart.version === 0) {
    chart.timeline.otherObjects = chart.timeline.bpmChanges.map(
      (object: any) => {
        object.type = 0;
        object.value = object.bpm;
        return object as OtherObjectData;
      }
    );
    chart.timeline.speedChanges.map((object: any) => {
      object.type = 1;
      object.value = object.speed;
      chart.timeline.otherObjects.push(object as OtherObjectData);
    });
  }
}
