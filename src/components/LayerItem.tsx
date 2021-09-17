import { Button, IconButton, ListItem, TextField } from "@mui/material";
import { Lock, LockOpen, Visibility, VisibilityOff } from "@mui/icons-material";
import * as React from "react";
import { Layer } from "src/objects/Layer";

interface IProps {
  selected: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  layer: Layer;
  onRename: (value: string) => void;
  onToggleLock: () => void;
  onGroup: (currentTarget: HTMLAnchorElement | HTMLButtonElement) => void;
}

export default (props: IProps) => {
  const { layer } = props;

  return (
    <ListItem
      button
      style={{
        padding: 0,
      }}
      selected={props.selected}
      onClick={() => props.onSelect()}
    >
      <IconButton
        style={{ padding: ".5rem" }}
        onClick={() => props.onToggleVisible()}
        size="large"
      >
        {layer.visible ? (
          <Visibility fontSize="small" />
        ) : (
          <VisibilityOff fontSize="small" />
        )}
      </IconButton>
      <IconButton
        style={{ padding: ".5rem", marginLeft: "-.5rem" }}
        onClick={() => props.onToggleLock()}
        size="large"
      >
        {layer.lock ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}
      </IconButton>
      <TextField
        variant="standard"
        value={layer.name}
        margin="dense"
        onChange={({ target: { value } }) => props.onRename(value)}
      />
      <div>
        <Button
          color="secondary"
          onClick={(e) => {
            props.onGroup(e.currentTarget);
          }}
          style={{
            width: "calc(36px - 1rem)",
            minWidth: "calc(36px - 1rem)",
            height: "calc(36px - 1rem)",
            borderRadius: "100%",
            marginRight: "0.25rem",
          }}
          sx={{
            backgroundColor: "action.active",
            color: "primary.contrastText",
          }}
        >
          {layer.group}
        </Button>
      </div>
    </ListItem>
  );
};
