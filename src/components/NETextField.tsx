import { useStyles } from "../styles/styles";
import { TextField } from "@mui/material";
import * as React from "react";
import { HTMLInputTypeAttribute } from "react";

export default function NETextField({
  label,
  value,
  onChange,
  type = "text",
  fullWidth = true,
}: {
  label: string;
  value: string | number;
  onChange: any;
  type?: HTMLInputTypeAttribute;
  fullWidth?: boolean;
}) {
  const classes = useStyles();

  return (
    <TextField
      type={type ?? "text"}
      variant="standard"
      label={label}
      fullWidth={fullWidth}
      style={{ margin: "6px 0" }}
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
      InputLabelProps={{
        shrink: true,
        className: classes.label,
      }}
      InputProps={{
        classes: {
          input: classes.input,
        },
      }}
    />
  );
}
