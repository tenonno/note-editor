import {
  Alert,
  ListItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { observer } from "mobx-react";
import * as React from "react";
import { useState } from "react";
import { useStores } from "../stores/stores";
import { Notification } from "../stores/EditorStore";
import { AlertColor } from "@mui/material/Alert/Alert";
import { useStyles } from "../styles/styles";
import * as _ from "lodash";
import { clipboard } from "electron";

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

export default observer(function Statistics() {
  const { editor } = useStores();

  const chart = editor.currentChart;

  if (!chart) return <div />;

  const classes = useStyles();
  const [smallMode, setSmallMode] = useState(false);

  function renderTable() {
    if (!chart) return <div />;

    // type でグループ化したノーツ
    const getGroup = chart.musicGameSystem.eventListeners.getGroup;
    let groups = Object.entries(
      _.groupBy(
        chart.timeline.notes,
        getGroup ? (n) => getGroup(n, chart) : "type"
      )
    ).sort();

    const noteInformation = chart.musicGameSystem.eventListeners.getNoteInformation?.(
      groups
    );

    // 並び替え
    groups = noteInformation?.sortedNoteTypeGroups ?? groups;

    function handleCopy() {
      const text = noteInformation?.getClipboardText?.();
      if (!text) return;
      clipboard.writeText(text);
    }

    const cellStyle = smallMode
      ? {
          maxWidth: "1rem",
          lineHeight: "1rem",
        }
      : {};

    return (
      <Table className={classes.table} size="small">
        <TableHead>
          <TableRow>
            <TableCell align="right" style={cellStyle}>
              key
            </TableCell>
            <TableCell align="right" style={cellStyle}>
              value
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {groups.map(([key, notes]) => (
            <TableRow key={key}>
              <TableCell>{key}</TableCell>
              <TableCell align="right">{notes.length}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return <div>{renderTable()}</div>;
});
