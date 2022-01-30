import {
  Alert,
  Divider,
  IconButton,
  List,
  ListItem,
  ListSubheader,
} from "@mui/material";
import { Refresh } from "@mui/icons-material";
import { observer } from "mobx-react";
import * as React from "react";
import { useStores } from "../stores/stores";

interface IProps {
  layer: string;
}

const Aaa = (props: IProps) => {
  const { layer } = props;

  return (
    <ListItem
      button
      style={{
        padding: 0,
      }}
    >
      <Alert severity="warning">{layer}</Alert>
    </ListItem>
  );
};

export default observer(function Problem() {
  const { editor } = useStores();

  const chart = editor.currentChart;

  if (!chart) return <div />;

  return (
    <List
      component="nav"
      subheader={
        <ListSubheader component="div">
          Problems
          <div style={{ display: "inline-block", float: "right" }}>
            <IconButton
              aria-label="delete"
              onClick={() => editor.checkNoteOverlap()}
            >
              <Refresh />
            </IconButton>
          </div>
        </ListSubheader>
      }
    >
      {chart.overlapWarningMessages.map((notification, index) => (
        <div key={notification}>
          <Aaa layer={notification} />
          <Divider />
        </div>
      ))}
    </List>
  );
});
