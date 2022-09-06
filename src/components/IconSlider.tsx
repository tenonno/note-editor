import * as React from "react";
import { useState } from "react";
import { IconButton, Slider } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles(() => ({
  playerButton: {},
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

export function IconSlider({
  icon,
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  icon: JSX.Element;
  onChange: (
    event: Event,
    value: number | number[],
    activeThumb: number
  ) => void;
}) {
  const [hover, setHover] = useState(false);
  const classes = useStyles();

  return (
    <span
      onMouseOver={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <IconButton
        style={{ color: "#fff" }}
        className={classes.playerButton}
        aria-label="Delete"
        size="large"
      >
        {icon}
      </IconButton>

      {hover && (
        <Slider
          value={value}
          min={min}
          max={max}
          step={step}
          style={{
            marginBottom: "-10px",
            marginRight: "60px",
            width: "100px",
            display: "inline-block",
          }}
          classes={{
            track: classes.volumeSliderTrack,
            thumb: classes.volumeSliderThumb,
          }}
          onChange={onChange}
        />
      )}
    </span>
  );
}
