import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { observer } from "mobx-react";
import * as React from "react";
import AudioSelect from "../components/AudioSelect";
import MusicGameSystemSelect from "../components/MusicGameSystemSelect";
import { useStores } from "../stores/stores";
import { useStyles } from "../styles/styles";
import NETextField from "../components/NETextField";

/**
 * 譜面設定コンポーネント
 */
export default observer(function ChartSetting() {
  const { editor } = useStores();
  const classes = useStyles();

  function handleAudioChange(newValue: string) {
    // 音源リセット
    if (newValue === null) {
      editor.currentChart!.resetAudio();
      return;
    }

    const buffer = editor.asset.loadAudioAsset(newValue);
    if (buffer) editor.currentChart!.setAudio(buffer, newValue);
  }

  function handleMusicGameSystemsChange(newValue: number | null) {
    console.log("handleMusicGameSystemsChange", newValue);
  }

  const chart = editor.currentChart;

  // 譜面が存在しない
  if (!chart) return <div />;

  return (
    <div style={{ width: "100%" }}>
      <NETextField
        label="タイトル"
        value={chart.name}
        onChange={(value: any) => chart.setName(value)}
        type={"text"}
      />
      <AudioSelect
        value={chart.audioSource || ""}
        onChange={handleAudioChange}
        audioAssetPath={editor.asset.audioAssetPath}
      />
      <NETextField
        label="制作者"
        value={chart.creator}
        onChange={(value: any) => chart?.setCreator(value)}
      />
      <div style={{ display: "flex" }}>
        <NETextField
          label="開始時間"
          value={chart.startTime.toString()}
          onChange={(value: any) => chart.setStartTime(parseFloat(value))}
          type="number"
        ></NETextField>

        <NETextField
          label="開発用開始時間"
          value={chart.developmentStartTime.toString()}
          onChange={(value: any) =>
            (chart.developmentStartTime = parseFloat(value))
          }
          type="number"
        />
      </div>

      <div style={{ display: "flex" }}>
        <FormControl
          style={{ width: "100%", margin: "6px 0" }}
          variant="standard"
        >
          <InputLabel htmlFor="difficulty" className={classes.label}>
            難易度
          </InputLabel>
          <Select
            value={chart.difficulty}
            onChange={({ target: { value } }) => {
              chart.setDifficulty(parseInt(value as string));
            }}
            inputProps={{
              className: classes.input,
              id: "difficulty",
            }}
          >
            {chart.musicGameSystem.difficulties.map((difficulty, index) => (
              <MenuItem value={index} key={difficulty}>
                {difficulty}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <NETextField
          label="レベル"
          value={chart.level}
          onChange={(value: string) => (chart.level = value)}
        ></NETextField>
      </div>

      <MusicGameSystemSelect
        value={editor.asset.musicGameSystems.findIndex(
          (path) => path === chart.musicGameSystem
        )}
        onChange={handleMusicGameSystemsChange}
      />
      <div
        style={{
          maxHeight: 200,
          whiteSpace: "pre",
          overflow: "scroll",
          background: "#eee",
        }}
      />
      <Button
        variant="outlined"
        onClick={() => editor.setInspectorTarget(chart.customProps)}
      >
        カスタム設定
      </Button>
    </div>
  );
});
