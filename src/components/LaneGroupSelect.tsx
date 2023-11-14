import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ToggleButton from "@mui/material/ToggleButton";
import * as React from "react";
import { ObjectCategory } from "../stores/EditorSetting";
import MusicGameSystem from "../stores/MusicGameSystem";
import useStyles from "../styles/ToolBar";

export default function LaneGroupSelect({
  musicGameSystem,
  editNoteTypeIndex,
  editLaneTypeIndex,
  onLane,
}: {
  musicGameSystem: MusicGameSystem;
  editNoteTypeIndex: number;
  editLaneTypeIndex: Map<string, Map<string, number>>;
  onLane: (el: Element) => void;
}) {
  const classes = useStyles();

  const laneDisabled = musicGameSystem.laneTemplates.length === 0;

  var p = musicGameSystem.noteLaneGroupMap.get(
    musicGameSystem.noteTypes[editNoteTypeIndex]?.name
  );

  const editLL =
    editLaneTypeIndex
      ?.get(musicGameSystem.name)
      ?.get(musicGameSystem.noteTypes[editNoteTypeIndex].name) ?? 0;

  if (!p) return <></>;

  return (
    <div className={classes.toggleContainer}>
      <ToggleButton
        className={classes.toggleButton}
        value={ObjectCategory.Lane}
        disabled={laneDisabled}
      >
        {p[editLL]?.name}
        <ArrowDropDownIcon onClick={(e) => onLane(e.currentTarget)} />
      </ToggleButton>
    </div>
  );
}
