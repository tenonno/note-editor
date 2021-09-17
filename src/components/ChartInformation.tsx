import {
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import Popover from "@mui/material/Popover";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import TextRotateVerticalIcon from "@mui/icons-material/TextRotateVertical";
import TextRotationNoneIcon from "@mui/icons-material/TextRotationNone";
import { clipboard } from "electron";
import * as _ from "lodash";
import { observer } from "mobx-react";
import React, { useState } from "react";
import { useStores } from "../stores/stores";
import { useStyles } from "../styles/styles";

interface IProps {
  open: boolean;
  onClose: any;
  anchorEl: HTMLElement;
}

export default observer(function ChartInformation(props: IProps) {
  const { editor } = useStores();
  const classes = useStyles();
  const [smallMode, setSmallMode] = useState(false);
  const chart = editor.currentChart;

  if (!chart) return <div />;

  function renderTable() {
    if (!chart || !props.open) return <div />;

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
              合計
            </TableCell>
            {groups.map(([key, _]) => (
              <TableCell align="right" key={key} style={cellStyle}>
                {key}
              </TableCell>
            ))}
            <TableCell>
              <IconButton
                onClick={() => {
                  props.onClose();
                  setSmallMode(!smallMode);
                }}
                style={{ margin: 0 }}
                size="large">
                {smallMode ? (
                  <TextRotationNoneIcon fontSize="small" />
                ) : (
                  <TextRotateVerticalIcon fontSize="small" />
                )}
              </IconButton>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>{chart.timeline.notes.length}</TableCell>
            {groups.map(([key, notes]) => (
              <TableCell align="right" key={key}>
                {notes.length}
              </TableCell>
            ))}
            <TableCell>
              <IconButton
                disabled={!noteInformation}
                onClick={handleCopy}
                style={{ margin: 0 }}
                size="large">
                <FileCopyIcon fontSize="small" />
              </IconButton>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <Popover
      open={props.open}
      onClose={props.onClose}
      anchorEl={props.anchorEl}
    >
      {renderTable()}
    </Popover>
  );
});
