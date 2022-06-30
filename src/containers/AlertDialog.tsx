import * as React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useStores } from "../stores/stores";
import { observer } from "mobx-react";

export default observer(() => {
  const { editor } = useStores();

  const open = editor.openReloadDialog;

  const handleCancel = () => {
    editor.openReloadDialog = false;
  };

  const handleReload = () => {
    localStorage.setItem(
      "filePaths",
      JSON.stringify(editor.charts.map((c) => c.filePath).filter((p) => p))
    );
    location.reload();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        エディタをリロードしますか？
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          保存していない譜面データが失われる可能性があります
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} autoFocus>
          キャンセル
        </Button>
        <Button onClick={handleReload}>リロードする</Button>
      </DialogActions>
    </Dialog>
  );
});
