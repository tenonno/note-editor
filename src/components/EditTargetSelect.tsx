import { TextField } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import * as React from "react";
import { ObjectCategory } from "../stores/EditorSetting";
import MusicGameSystem, { OtherObjectType } from "../stores/MusicGameSystem";
import useStyles from "../styles/ToolBar";

function OtherObjectToggleButton({
  otherObjectType,
  values,
  disabled,
  valueChange,
  onOther,
}: {
  otherObjectType: OtherObjectType;
  values: Map<string, string | number>;
  disabled: boolean;
  valueChange: (value: number | string) => void;
  onOther: (el: Element) => void;
}) {
  if (disabled) {
    return null;
  }

  if (!values.has(otherObjectType.name)) {
    values.set(otherObjectType.name, otherObjectType.defaultValue ?? "");
  }

  const value = values.get(otherObjectType.name);

  return (
    <>
      <span>
        {otherObjectType.name}
        {otherObjectType.valueType === "none" ? null : (
          <TextField
            required
            variant="standard"
            value={value}
            margin="none"
            type={otherObjectType.valueType}
            InputProps={{
              inputProps: {
                style: {
                  width: "4rem",
                  marginRight: "-.8rem",
                  textAlign: "center",
                  marginTop: "-.25rem",
                },
              },
            }}
            style={{ height: 24 }}
            onChange={({ target: { value } }) => {
              if (otherObjectType.valueType === "number") {
                valueChange(Number(value));
              }
              valueChange(value);
            }}
          />
        )}
      </span>
      <ArrowDropDownIcon onClick={(e) => onOther(e.currentTarget)} />
    </>
  );
}

export default function EditTargetSelect({
  value,
  onChange,
  musicGameSystem,
  editNoteTypeIndex,
  editLaneTypeIndex,
  editOtherTypeIndex,
  otherValues,
  onOtherValueChange,
  onNote,
  onLane,
  onOther,
  laneEditMode,
}: {
  value: ObjectCategory;
  onChange: (editObjectCategory: ObjectCategory) => void;
  musicGameSystem: MusicGameSystem;
  editNoteTypeIndex: number;
  editLaneTypeIndex: number;
  editOtherTypeIndex: number;
  otherValues: Map<string, number | string>;
  onOtherValueChange: (value: number | string) => void;
  onNote: (el: Element) => void;
  onLane: (el: Element) => void;
  onOther: (el: Element) => void;
  laneEditMode: boolean;
}) {
  const classes = useStyles();

  const noteDisabled = musicGameSystem.noteTypes.length === 0;
  const laneDisabled = musicGameSystem.laneTemplates.length === 0;
  const otherDisabled = musicGameSystem.otherObjectTypes.length === 0;

  const otherObjectType = musicGameSystem.otherObjectTypes[editOtherTypeIndex];

  return (
    <div className={classes.toggleContainer}>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_, value: ObjectCategory | null) => {
          if (value === null) return;
          onChange(value);
        }}
      >
        {/* Note */}
        <ToggleButton
          className={classes.toggleButton}
          value={ObjectCategory.Note}
          disabled={noteDisabled}
        >
          {musicGameSystem.noteTypes[editNoteTypeIndex]?.name}
          <ArrowDropDownIcon onClick={(e) => onNote(e.currentTarget)} />
        </ToggleButton>
        {/* Lane */}
        {laneEditMode && (
          <ToggleButton
            className={classes.toggleButton}
            value={ObjectCategory.Lane}
            disabled={laneDisabled}
          >
            {musicGameSystem.laneTemplates[editLaneTypeIndex]?.name}
            <ArrowDropDownIcon onClick={(e) => onLane(e.currentTarget)} />
          </ToggleButton>
        )}
        {/* Other */}
        <ToggleButton
          className={classes.toggleButton}
          value={ObjectCategory.Other}
          disabled={otherDisabled}
        >
          <OtherObjectToggleButton
            otherObjectType={otherObjectType}
            values={otherValues}
            disabled={otherDisabled}
            valueChange={onOtherValueChange}
            onOther={onOther}
          />
        </ToggleButton>
      </ToggleButtonGroup>
    </div>
  );
}
