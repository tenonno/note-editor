import { Fab } from "@mui/material";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import AddIcon from "@mui/icons-material/Add";
import { observer } from "mobx-react";
import * as React from "react";
import { useState } from "react";
import { useStores } from "../stores/stores";
import AudioSelect from "./AudioSelect";
import MusicGameSystemSelect from "./MusicGameSystemSelect";

export default observer(function NewChartDialog() {
  const { editor } = useStores();

  const [state, setState] = useState<{
    open: boolean;
    audioPath: string;
    musicGameSystemIndex: number | null;
  }>({
    open: false,
    audioPath: "",
    musicGameSystemIndex: null,
  });

  function handleClickOpen() {
    setState({
      ...state,
      open: true,
    });
  }

  function handleClose() {
    setState({
      ...state,
      open: false,
    });
  }

  function handleCreate() {
    const newChart = editor.newChart(
      editor.asset.musicGameSystems[Number(state.musicGameSystemIndex)],
      state.audioPath
    );
    newChart.loadInitialMeasures();
    newChart.loadInitialLanes();
    newChart.addLayer();
    editor.setCurrentChart(editor.charts.length - 1);

    handleClose();
  }

  return (
    <div
      style={{
        margin: 4,
        position: "absolute",
        left: "calc(100% - 48px)",
      }}
    >
      <Fab
        color="primary"
        aria-label="Add"
        size="small"
        onClick={handleClickOpen}
      >
        <AddIcon />
      </Fab>

      <Dialog
        open={state.open}
        onClose={handleClose}
        aria-labelledby="form-dialog-title"
      >
        <DialogTitle id="form-dialog-title">新規譜面</DialogTitle>
        <DialogContent>
          <DialogContentText />

          <div style={{ marginTop: ".5rem" }}>
            <MusicGameSystemSelect
              value={state.musicGameSystemIndex}
              onChange={(newValue) =>
                setState({
                  ...state,
                  musicGameSystemIndex: newValue,
                })
              }
            />
          </div>
          <div style={{ marginTop: ".5rem" }}>
            <AudioSelect
              value={state.audioPath}
              onChange={(newValue) =>
                setState({
                  ...state,
                  audioPath: newValue,
                })
              }
              audioAssetPath={editor.asset.audioAssetPath}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            キャンセル
          </Button>
          <Button onClick={handleCreate} color="primary">
            作成
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
});
