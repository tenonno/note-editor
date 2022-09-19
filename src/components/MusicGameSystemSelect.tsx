import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { observer } from "mobx-react";
import * as React from "react";
import { useStores } from "../stores/stores";
import { useStyles } from "../styles/styles";

interface IProps {
  value: number;
  onChange: (newValue: number) => void;
}

export default observer(function MusicGameSystemSelect({
  value,
  onChange,
}: IProps) {
  const { editor } = useStores();
  const classes = useStyles();

  return (
    <FormControl style={{ width: "100%", margin: "6px 0" }} variant="standard">
      <InputLabel htmlFor="musicGameSystem" className={classes.label}>
        システム
      </InputLabel>
      <Select
        value={value === null ? -1 : value}
        onChange={(e: any) => {
          const v = e.target.value;
          onChange(v);
        }}
        inputProps={{
          className: classes.input,
          name: "currentMusicGameSystem",
          id: "musicGameSystem",
        }}
      >
        <MenuItem value={-1}>
          <em>None</em>
        </MenuItem>
        {editor.asset.musicGameSystems.map((c, i) => (
          <MenuItem value={i} key={i}>
            {c.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
});
