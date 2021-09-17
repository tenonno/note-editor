import { IconButton, ListItem, TextField } from "@mui/material";
import { Lock, LockOpen, Visibility, VisibilityOff } from "@mui/icons-material";
import * as React from "react";
import { Layer } from "src/objects/Layer";

interface IProps {
  selected: any;
  onSelect: any;
  onToggleVisible: any;
  layer: Layer;
  onRename: any;
  onToggleLock: any;
}

export default (props: IProps) => {
  const { layer } = props;
  const index = 0;

  return (
    <ListItem
      button
      style={{
        padding: 0,
      }}
      selected={props.selected}
      onClick={() => props.onSelect(index)}
    >
      <IconButton
        style={{ padding: ".5rem" }}
        onClick={() => props.onToggleVisible(index)}
        size="large">
        {layer.visible ? (
          <Visibility fontSize="small" />
        ) : (
          <VisibilityOff fontSize="small" />
        )}
      </IconButton>
      <IconButton
        style={{ padding: ".5rem", marginLeft: "-.5rem" }}
        onClick={() => props.onToggleLock(index)}
        size="large">
        {layer.lock ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}
      </IconButton>
      <TextField
        value={layer.name}
        margin="dense"
        onChange={({ target: { value } }) => props.onRename(value)}
      />{" "}
      <IconButton
        style={{ padding: ".5rem", marginLeft: "-.5rem" }}
        onClick={() => props.onToggleLock(index)}
        size="large">
        {layer.lock ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}
      </IconButton>
    </ListItem>
  );
};
