import {
  Clear as ClearIcon,
  Create as CreateIcon,
  ShowChart as ShowChartIcon,
} from "@mui/icons-material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import * as React from "react";
import { EditMode } from "../stores/EditorSetting";
import useStyles from "../styles/ToolBar";

export default function ({
  value,
  onChange,
}: {
  value: EditMode;
  onChange: (editMode: EditMode) => void;
}) {
  const classes = useStyles();

  return (
    <div className={classes.toggleContainer}>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_, value: EditMode | null) => {
          if (value === null) return;
          onChange(value);
        }}
      >
        <ToggleButton className={classes.toggleButton} value={EditMode.Select}>
          <ArrowUpwardIcon />
        </ToggleButton>
        <ToggleButton className={classes.toggleButton} value={EditMode.Add}>
          <CreateIcon />
        </ToggleButton>
        <ToggleButton className={classes.toggleButton} value={EditMode.Delete}>
          <ClearIcon />
        </ToggleButton>
        <ToggleButton className={classes.toggleButton} value={EditMode.Connect}>
          <ShowChartIcon />
        </ToggleButton>
      </ToggleButtonGroup>
    </div>
  );
}
