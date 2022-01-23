import { last } from "lodash";
import { OtherObjectData } from "../objects/OtherObject";
import { ChartJsonData } from "../stores/Chart";
import { guid } from "./guid";

function updateToV3(chart: ChartJsonData) {
  // レイヤーにグループを追加
  for (const layer of chart.layers) {
    if (!layer.group) {
      layer.group = 1;
    }
  }

  // otherObjects をレイヤーに所属させる
  for (const otherObject of chart.timeline.otherObjects) {
    if (!otherObject.layer) {
      otherObject.layer = last(chart.layers)!.guid;
    }
  }
}

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

  // 譜面にレイヤー情報がなければ初期レイヤーを生成する
  if (chart.layers.length === 0) {
    const initialLayerGuid = guid();

    chart.layers.push({
      guid: initialLayerGuid,
      name: "レイヤー1",
      visible: true,
      lock: false,
      group: 1,
    });

    // 全ノートを初期レイヤーに割り当てる
    for (const note of chart.timeline.notes) {
      note.layer = initialLayerGuid;
    }
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

  if (chart.version < 3) {
    updateToV3(chart);
  }
}
