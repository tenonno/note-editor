import {
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { dialog } from "@electron/remote";
import * as React from "react";
import { useStyles } from "../styles/styles";
import { Delete } from "@mui/icons-material";

export default function ({
  value,
  onChange,
  assetsPath,
}: {
  value: string | null;
  onChange: (newValue: string | null) => void;
  assetsPath: string;
}) {
  const classes = useStyles();

  return (
    <FormControl
      style={{ width: "100%", margin: "6px 0", display: "block" }}
      variant="standard"
    >
      <InputLabel htmlFor="audio" className={classes.label}>
        背景
      </InputLabel>
      <Select
        value={0}
        style={{
          width: 174,
        }}
        onClick={() => {
          const result = dialog.showOpenDialogSync({
            defaultPath: assetsPath,
            filters: [{ name: "背景", extensions: ["png", "jpg", "gif"] }],
          });

          console.log(result);

          if (result) {
            onChange(
              result[0]
                .replace(assetsPath, "")
                .split(/^[\/\\]/)
                .pop()!
            );
          }
        }}
        inputProps={{ disabled: true }}
      >
        <MenuItem value="0">{value || <em>None</em>}</MenuItem>
      </Select>
      <IconButton onClick={() => onChange(null)} size="large">
        <Delete fontSize="small" />
      </IconButton>
    </FormControl>
  );
}
