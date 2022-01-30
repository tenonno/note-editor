import { Alert, Divider, List, ListItem, ListSubheader } from "@mui/material";
import { observer } from "mobx-react";
import * as React from "react";
import { useStores } from "../stores/stores";
import { Notification } from "../stores/EditorStore";
import { AlertColor } from "@mui/material/Alert/Alert";

interface IProps {
  layer: Notification;
}

const LayerItem = (props: IProps) => {
  const { layer } = props;

  const severity = layer.type as AlertColor;

  return (
    <ListItem
      button
      style={{
        padding: 0,
      }}
    >
      <Alert severity={severity}>
        {layer.text}
        <br />
        {layer.date.toLocaleString()}
      </Alert>
    </ListItem>
  );
};

export default observer(function Notification() {
  const { editor } = useStores();

  const chart = editor.currentChart;

  if (!chart) return <div />;

  return (
    <List
      component="nav"
      subheader={<ListSubheader component="div">Notifications</ListSubheader>}
    >
      {editor.notifications.map((notification) => (
        <div key={notification.guid}>
          <LayerItem layer={notification} />
          <Divider />
        </div>
      ))}
    </List>
  );
});
