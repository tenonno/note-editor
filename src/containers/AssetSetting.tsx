import {
  FormControlLabel,
  FormGroup,
  Switch,
  TextField,
} from "@mui/material";
import { observer } from "mobx-react";
import * as React from "react";
import { useStores } from "../stores/stores";
import { useStyles } from "../styles/styles";

const AssetSetting = observer(() => {
  const { editor } = useStores();
  const classes = useStyles();

  function renderTextField(
    label: string,
    value: string | number,
    onChange: any,
    type = "text"
  ) {
    return (
      <TextField
        type={type}
        label={label}
        fullWidth
        style={{ margin: "6px 0" }}
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        InputLabelProps={{
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

  return (
    <div>
      {renderTextField(
        "ポート",
        editor.setting.serverPort,
        (value: any) => (editor.setting.serverPort = Number(value)),
        "number"
      )}
      <FormGroup row>
        <FormControlLabel
          control={
            <Switch
              checked={editor.setting.serverEnabled}
              onChange={(_, checked) => editor.updateServer(checked)}
              name="serverEnabled"
            />
          }
          label="外部連携"
        />
      </FormGroup>
    </div>
  );
});

export default AssetSetting;
