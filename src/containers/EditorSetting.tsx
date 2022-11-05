import {
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
} from "@mui/material";
import { observer } from "mobx-react";
import * as React from "react";
import { ChartTabLabelType } from "../stores/EditorSetting";
import { useStores } from "../stores/stores";
import { useStyles } from "../styles/styles";
import BackgroundSelect from "../components/BackgroundSelect";
import NETextField from "../components/NETextField";

export default observer(function EditorSetting() {
  const classes = useStyles();
  const { editor } = useStores();
  const { setting } = editor;

  function handleAudioChange(newValue: string | null) {
    setting.setBackgroundImagePath(newValue, editor.asset.assetsPath);
  }

  // @ts-ignore
  return (
    <div style={{ width: "100%" }}>
      <FormControl>
        <div style={{ display: "flex" }}>
          <NETextField
            label="小節の幅"
            value={setting.measureWidth.toString()}
            onChange={(value: any) => setting.setMeasureWidth(value | 0)}
            type="number"
            fullWidth={false}
          />

          <NETextField
            label={"小節の高さ"}
            value={setting.measureHeight.toString()}
            onChange={(value: any) => setting.setMeasureHeight(value | 0)}
            type={"number"}
            fullWidth={false}
          />
        </div>

        <NETextField
          label="Vertical Lane Count"
          value={setting.verticalLaneCount.toString()}
          onChange={(value: any) => setting.setVerticalLaneCount(value | 0)}
          type={"number"}
        />

        <div style={{ display: "flex" }}>
          <NETextField
            label={"水平余白"}
            value={setting.horizontalPadding.toString()}
            onChange={(value: any) => (setting.horizontalPadding = value | 0)}
            type={"number"}
            fullWidth={false}
          />

          <NETextField
            label={"垂直余白"}
            value={setting.verticalPadding.toString()}
            onChange={(value: any) => (setting.verticalPadding = value | 0)}
            type={"number"}
            fullWidth={false}
          />
        </div>

        <FormControl
          style={{ width: "100%", margin: "6px 0" }}
          variant="standard"
        >
          <InputLabel htmlFor="measureLayout" className={classes.label}>
            小節レイアウト
          </InputLabel>
          <Select
            value={setting.currentMeasureLayoutIndex}
            onChange={(e: any) => {
              const value: number = e.target.value;
              setting.setCurrentMeasureLayoutIndex(value);
            }}
            inputProps={{
              className: classes.input,
              id: "measureLayout",
            }}
          >
            {setting.measureLayouts.map((layout, index) => (
              <MenuItem value={index} key={index}>
                {layout.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl
          style={{ width: "100%", margin: "6px 0" }}
          variant="standard"
        >
          <InputLabel htmlFor="inspectorIndex" className={classes.label}>
            インスペクタ
          </InputLabel>
          <Select
            value={setting.currentInspectorIndex}
            onChange={(e: any) => {
              const value: number = e.target.value;
              setting.currentInspectorIndex = value;
            }}
            inputProps={{
              className: classes.input,
              id: "inspectorIndex",
            }}
          >
            {setting.inspectorNames.map((name, index) => (
              <MenuItem value={index} key={index}>
                {name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <BackgroundSelect
          value={setting.backgroundImagePath}
          onChange={handleAudioChange}
          assetsPath={editor.asset.assetsPath}
        />

        <FormControlLabel
          control={
            <Switch
              checked={setting.reverseScroll}
              onChange={(_, value) => setting.setReverseScroll(value)}
              color="primary"
            />
          }
          label="スクロール反転"
        />

        <FormControlLabel
          control={
            <Switch
              checked={setting.tabLabelType == ChartTabLabelType.FilePath}
              onChange={(_, value) =>
                (setting.tabLabelType = value
                  ? ChartTabLabelType.FilePath
                  : ChartTabLabelType.Name)
              }
              color="primary"
            />
          }
          label="タブにファイル名を表示"
        />

        <FormControlLabel
          control={
            <Switch
              checked={setting.preserve3D}
              onChange={(_, value) =>
                setting.set3D(
                  value,
                  setting.rotateX,
                  setting.scale3D,
                  setting.perspective
                )
              }
              color="primary"
            />
          }
          label="3D モード"
        />

        {setting.preserve3D && (
          <>
            <NETextField
              label="3D 回転"
              value={setting.rotateX.toString()}
              onChange={(value: any) =>
                setting.set3D(
                  setting.preserve3D,
                  parseFloat(value),
                  setting.scale3D,
                  setting.perspective
                )
              }
              type="number"
            />

            <NETextField
              label="3D 拡大率"
              value={setting.scale3D.toString()}
              onChange={(value: any) =>
                setting.set3D(
                  setting.preserve3D,
                  setting.rotateX,
                  parseFloat(value),
                  setting.perspective
                )
              }
              type="number"
            />

            <NETextField
              label="3D 遠近"
              value={setting.perspective.toString()}
              onChange={(value: any) =>
                setting.set3D(
                  setting.preserve3D,
                  setting.rotateX,
                  setting.scale3D,
                  parseFloat(value)
                )
              }
              type="number"
            />
          </>
        )}
        <FormControlLabel
        control={
          <Switch
            checked={setting.saveToDrive}
            onChange={(_, value) => setting.setSaveToDrive(value)}
            color="primary"
          />
        }
        label="保存時にDriveにアップロード"
      />
      </FormControl>
    </div>
  );
});
