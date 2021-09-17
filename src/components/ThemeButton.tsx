import { IconButton } from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { observer } from "mobx-react";
import * as React from "react";
import { useStores } from "../stores/stores";

/**
 * テーマ切り替えボタン
 */
export default observer(function ThemeButton() {
  const { editor } = useStores();
  return (
    <IconButton
      onClick={() => {
        editor.setting.toggleMuiTheme();
      }}
      size="large">
      {editor.setting.muiThemeType === "light" ? (
        <Brightness4Icon />
      ) : (
        <Brightness7Icon />
      )}
    </IconButton>
  );
});
