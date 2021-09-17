import { IconButton, Slider } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { Theme } from "@mui/material/styles";
import NotesIcon from "@mui/icons-material/Notes";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrow from "@mui/icons-material/PlayArrow";
import SpeedIcon from "@mui/icons-material/Speed";
import SeVolumeIcon from "@mui/icons-material/SurroundSound";
import SpeakerIcon from "@mui/icons-material/VolumeUp";
import { observer } from "mobx-react";
import * as React from "react";
import { useState } from "react";
import ChartInformation from "../components/ChartInformation";
import { useStores } from "../stores/stores";
import Skeleton from "@mui/material/Skeleton";

const useStyles = makeStyles((theme: Theme) => ({
  playerButton: {},
  timeSliderTrack: {
    height: "4px",
    background: "red",
    border: "none",
  },
  timeSliderThumb: {
    width: "14px",
    height: "14px",
    background: "red",
  },
  volumeSliderTrack: {
    height: "4px",
    background: "#fff",
  },
  volumeSliderThumb: {
    width: "14px",
    height: "14px",
    background: "#fff",
  },
}));

const TimeSlider = (props: { classes: any; time: number; onChange: any }) => (
  <Slider
    value={props.time}
    min={0}
    max={1}
    step={Number.EPSILON}
    classes={{
      track: props.classes.timeSliderTrack,
      thumb: props.classes.timeSliderThumb,
    }}
    onChange={props.onChange}
  />
);

export default observer(function Player() {
  const { editor } = useStores();
  const classes = useStyles();
  const [state, setState] = useState({
    openInformation: false,
  });

  function formatTime(time: number) {
    const sec = Math.floor(time % 60);
    const min = Math.floor(time / 60);

    return `${min}:${sec.toString().padStart(2, "0")}`;
  }

  const chart = editor.currentChart;

  if (!chart || !chart.audio || !chart.audioBuffer) {
    return <Skeleton variant="rectangular" height={48} />;
  }

  const duration = chart.audio.duration();
  const time = duration === 0 ? 0 : chart.time / duration;

  return (
    <div
      style={{
        background: "black",
        marginTop: "calc((62px - 48px) * -1)",
      }}
    >
      <div
        style={{
          display: "flex",
          background: "#000",
          margin: "0 14px",
        }}
      >
        <TimeSlider
          time={time}
          classes={classes}
          onChange={(_: any, value: any) => {
            editor.currentChart!.setTime(
              value * editor.currentChart!.audio!.duration(),
              true
            );
          }}
        />
      </div>

      <div style={{ background: "#000", marginTop: "-14px" }}>
        {!chart.isPlaying ? (
          <IconButton
            style={{ color: "#fff" }}
            className={classes.playerButton}
            aria-label=""
            onClick={() => {
              editor.currentChart!.play();
            }}
            size="large"
          >
            <PlayArrow />
          </IconButton>
        ) : (
          <IconButton
            style={{ color: "#fff" }}
            className={classes.playerButton}
            aria-label=""
            onClick={() => {
              editor.currentChart!.pause();
            }}
            size="large"
          >
            <PauseIcon />
          </IconButton>
        )}

        <span style={{ color: "#fff" }}>
          {formatTime(chart.audioBuffer!.duration * time)}
          {" / "}
          {formatTime(chart.audioBuffer!.duration)}
        </span>

        <IconButton
          style={{ color: "#fff" }}
          className={classes.playerButton}
          aria-label="Delete"
          size="large"
        >
          <SpeakerIcon />
        </IconButton>

        {/* volume */}
        <Slider
          value={chart.volume}
          min={0}
          max={1}
          step={Number.EPSILON}
          style={{
            marginBottom: "-10px",
            marginRight: "10px",
            width: "100px",
            display: "inline-block",
          }}
          classes={{
            track: classes.volumeSliderTrack,
            thumb: classes.volumeSliderThumb,
          }}
          onChange={(_, value) => {
            editor!.currentChart!.setVolume(value as number);
          }}
        />

        <IconButton
          style={{ color: "#fff" }}
          className={classes.playerButton}
          size="large"
        >
          <SpeedIcon />
        </IconButton>

        <Slider
          value={chart.speed}
          min={0.1}
          max={1}
          step={0.1}
          style={{
            marginBottom: "-10px",
            marginRight: "10px",
            width: "100px",
            display: "inline-block",
          }}
          classes={{
            track: classes.volumeSliderTrack,
            thumb: classes.volumeSliderThumb,
          }}
          onChange={(_, value) => {
            chart.setSpeed(value as number);
          }}
        />

        <IconButton
          style={{ color: "#fff" }}
          className={classes.playerButton}
          size="large"
        >
          <SeVolumeIcon />
        </IconButton>

        <Slider
          value={chart.seVolume}
          min={0}
          max={1}
          step={0.1}
          style={{
            marginBottom: "-10px",
            marginRight: "10px",
            width: "100px",
            display: "inline-block",
          }}
          classes={{
            track: classes.volumeSliderTrack,
            thumb: classes.volumeSliderThumb,
          }}
          onChange={(_, value) => {
            chart.setSeVolume(value as number);
          }}
        />

        <IconButton
          id="notes"
          style={{ color: "#fff", float: "right" }}
          className={classes.playerButton}
          onClick={() => setState({ openInformation: true })}
          size="large"
        >
          <NotesIcon />
        </IconButton>

        <ChartInformation
          open={state.openInformation}
          onClose={() => setState({ openInformation: false })}
          anchorEl={document.querySelector("#notes")! as HTMLElement}
        />
      </div>
    </div>
  );
});
