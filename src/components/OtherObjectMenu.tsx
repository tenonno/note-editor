import { Menu, MenuItem } from "@mui/material";
import createStyles from "@mui/styles/createStyles";
import makeStyles from "@mui/styles/makeStyles";
import { Theme } from "@mui/material/styles";
import { observer } from "mobx-react";
import * as React from "react";
import { emptyChart, IEmptyChart } from "../stores/EmptyChart";
import { useStores } from "../stores/stores";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    badge: {
      marginTop: ".8rem",
      marginRight: ".5rem",
      boxShadow: `0 0 0 2px ${
        theme.palette.mode === "light"
          ? theme.palette.grey[200]
          : theme.palette.grey[900]
      }`,
    },
    displaySetting: {
      outline: 0,
      padding: theme.spacing(2),
    },
  })
);

export default observer(function Toolbar() {
  const { editor } = useStores();
  const classes = useStyles();

  const [state, setState] = React.useState<{
    timelineDivisionSize: number;
    laneDivisionSize: number;
    laneAnchorEl: Element | null;
    noteAnchorEl: Element | null;
    otherAnchorEl: Element | null;
    objectSizeAnchorEl: Element | null;
    displaySettingAnchorEl: Element | null;
    customColorAnchorEl: Element | null;
    anchorEl: Element | null;
  }>({
    // タイムライン上に配置するオブジェクトのサイズ
    timelineDivisionSize: 1,
    // レーン上に配置するオブジェクのサイズ
    laneDivisionSize: 1,

    laneAnchorEl: null,
    noteAnchorEl: null,

    // その他オブジェクトメニューアンカー
    otherAnchorEl: null,

    objectSizeAnchorEl: null,

    displaySettingAnchorEl: null,

    customColorAnchorEl: null,

    anchorEl: null,
  });

  function handleClick(event: any) {
    setState({
      ...state,
      anchorEl: event.currentTarget as HTMLElement,
    });
  }

  function handleClose() {
    setState({ ...state, anchorEl: null });
  }

  function handleDrawerToggle() {
    editor.setting.drawerOpened = !editor.setting.drawerOpened;
  }

  const { setting } = editor;

  const { anchorEl } = state;

  const chart: IEmptyChart = editor.currentChart ?? emptyChart;

  const otherTypes = chart.musicGameSystem.otherObjectTypes;

  return (
    <Menu
      anchorEl={state.otherAnchorEl}
      open={Boolean(state.otherAnchorEl)}
      onClose={(e: any) => {
        setState({ ...state, otherAnchorEl: null });
      }}
    >
      {(() => {
        if (!chart.musicGameSystem) return;

        return otherTypes.map(({ name }, index) => (
          <MenuItem
            key={index}
            onClick={() => {
              setting.setEditOtherTypeIndex(index);
              setState({ ...state, otherAnchorEl: null });
            }}
          >
            {name}
          </MenuItem>
        ));
      })()}
    </Menu>
  );
});
