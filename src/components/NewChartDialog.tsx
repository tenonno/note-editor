import { Fab, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import AddIcon from "@mui/icons-material/Add";
import { observer } from "mobx-react";
import * as React from "react";
import { useEffect, useState } from "react";
import { useStores } from "../stores/stores";
import AudioSelect from "./AudioSelect";
import MusicGameSystemSelect from "./MusicGameSystemSelect";
import NETextField from "./NETextField";

export default observer(function NewChartDialog() {
  const { editor } = useStores();

  const [state, setState] = useState<{
    open: boolean;
    audioPath: string;
  }>({
    open: false,
    audioPath: "",
  });

  const [musicGameSystemIndex, setMusicGameSystemIndex] = useState(-1);
  const [name, setName] = useState("新規譜面");
  const [creator, setCreator] = useState("");
  const [difficulty, setDifficulty] = useState(0);
  const [level, setLevel] = useState("0");
  const [bpm, setBpm] = useState(120);

  useEffect(() => setDifficulty(0), [musicGameSystemIndex]);

  const difficulties =
    musicGameSystemIndex === -1
      ? [""]
      : editor.asset.musicGameSystems[musicGameSystemIndex].difficulties;

  if (difficulty >= difficulties.length) {
    console.warn("↓ useEffect のタイミングの問題で警告が出ます");
  }

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
    editor.createChart(
      editor.asset.musicGameSystems[musicGameSystemIndex],
      state.audioPath,
      name,
      creator,
      difficulty,
      level,
      bpm
    );

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
              value={musicGameSystemIndex}
              onChange={(newValue) => setMusicGameSystemIndex(newValue)}
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

          <NETextField
            label="タイトル"
            value={name}
            onChange={(value: any) => setName(value)}
            type={"text"}
          />
          <NETextField
            label="制作者"
            value={creator}
            onChange={(value: any) => setCreator(value)}
          />

          <div style={{ display: "flex" }}>
            <FormControl
              style={{ width: "100%", margin: "6px 0" }}
              variant="standard"
            >
              <InputLabel htmlFor="difficulty">難易度</InputLabel>
              <Select
                disabled={musicGameSystemIndex === -1}
                value={difficulty}
                onChange={({ target: { value } }) => {
                  setDifficulty(parseInt(value as string));
                }}
                inputProps={{
                  id: "difficulty",
                }}
              >
                {difficulties.map((difficulty, index) => (
                  <MenuItem value={index} key={difficulty}>
                    {difficulty}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <NETextField
              label="レベル"
              value={level}
              onChange={(value: string) => setLevel(value)}
            ></NETextField>
          </div>

          <NETextField
            label="開始 BPM"
            value={bpm}
            type="number"
            onChange={(value: number) => setBpm(value)}
          ></NETextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            キャンセル
          </Button>
          <Button
            disabled={musicGameSystemIndex === -1 || !state.audioPath}
            onClick={handleCreate}
            color="primary"
          >
            作成
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
});
