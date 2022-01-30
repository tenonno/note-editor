import { Drawer, Tab, Tabs } from "@mui/material";
import { observer } from "mobx-react";
import * as React from "react";
import { useStores } from "../stores/stores";
import makeStyles from "@mui/styles/makeStyles";
import { Theme } from "@mui/material/styles";
import createStyles from "@mui/styles/createStyles";
import config from "../config";
import Layer from "./Layer";
import Notification from "./Notification";
import Problem from "./Problem";

const drawerWidth: number = config.sidebarWidth;
const rightDrawerWidth = 300;

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: "flex",
    },
    rightDrawer: {
      //   width: rightDrawerWidth,
      flexShrink: 0,
      zIndex: 0,
    },
    rightDrawerPaper: {
      width: rightDrawerWidth + 91,
    },
    drawerRight: {
      width: rightDrawerWidth,
      flexShrink: 0,
    },
    drawerRightPaper: {
      width: rightDrawerWidth,
    },
    button: {
      margin: theme.spacing(),
    },
    fab: {
      position: "absolute",
      top: theme.spacing(0.5),
      right: theme.spacing(2),
      zIndex: 10000,
    },
    appFrame: {
      zIndex: 1,
      overflow: "hidden",
      position: "relative",
      display: "flex",
      width: "100%",
    },
    appBarOpen: {
      width: `calc(100% - ${drawerWidth}px)`,
    },
    appBarClose: {
      width: "100%",
    },
    appBarLeftOpen: {
      marginLeft: drawerWidth,
    },
    appBarLeftClose: {
      marginLeft: 0,
    },
    toolbar: theme.mixins.toolbar,
    content: {
      flexGrow: 1,
      display: "flex",
      flexDirection: "column",
      backgroundColor: theme.palette.background.default,
      height: "100vh",
    },
  })
);

function TabPanel(props: any) {
  const { children, value, index, visible, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}
    >
      {value === index && (
        <div
          style={{ display: "block", width: visible ? rightDrawerWidth : 0 }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/*
TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};
*/

function a11yProps(index: number, value: number, setValue: any) {
  return {
    id: `vertical-tab-${index}`,
    key: index,
    "aria-controls": `vertical-tabpanel-${index}`,
    onClick: (...args: any[]) => {
      if (value === index) {
        setValue(3);
      }
    },
  };
}

export default observer(function RightDrawer() {
  const { editor } = useStores();
  const classes = useStyles();

  const appBarHeight = editor.setting.tabHeight + 48;

  const chart = editor.currentChart;

  const [currentTabIndex, setCurrentTabIndex] = React.useState(0);

  const handleChange = (event: any, newValue: any) => {
    setCurrentTabIndex(newValue);
  };

  if (!chart) return <div />;

  const tabs = [
    { name: "Layer", element: () => <Layer /> },
    { name: "Problem", element: () => <Problem /> },
    { name: "Notification", element: () => <Notification /> },
  ];

  return (
    <Drawer
      className={classes.rightDrawer}
      variant="permanent"
      style={{
        width: currentTabIndex === tabs.length ? 40 : rightDrawerWidth + 40,
      }}
      /*
        classes={{
          paper: classes.rightDrawerPaper,
        }}
        */
      anchor="right"
    >
      <div
        style={{
          marginTop: appBarHeight,
        }}
      />
      <div
        style={{
          display: "flex",
          height: `calc(100vh - ${appBarHeight}px)`,
        }}
      >
        {tabs.map((tabPanel, index) => (
          <TabPanel
            value={currentTabIndex}
            key={index}
            index={index}
            visible={currentTabIndex !== tabs.length}
          >
            {tabPanel.element()}
          </TabPanel>
        ))}

        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={currentTabIndex}
          onChange={handleChange}
          aria-label="Vertical tabs example"
          sx={{ borderLeft: 1, borderColor: "divider" }}
        >
          {tabs.map((tabPanel, index) => (
            <Tab
              label={
                <span style={{ writingMode: "vertical-rl" }}>
                  {tabPanel.name}
                </span>
              }
              {...a11yProps(index, currentTabIndex, setCurrentTabIndex)}
              style={{
                display: "block",
                margin: "0px -26px",
              }}
            />
          ))}

          <Tab style={{ display: "none" }} />
        </Tabs>
      </div>
    </Drawer>
  );
});
