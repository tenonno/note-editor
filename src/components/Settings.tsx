import { Accordion, AccordionDetails, AccordionSummary, Divider } from "@mui/material";
import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import { Theme } from '@mui/material/styles';
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import * as React from "react";
import AssetSetting from "../containers/AssetSetting";
import ChartSetting from "../containers/ChartSetting";
import EditorSetting from "../containers/EditorSetting";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    panel: {
      boxShadow: "none",
      marginBottom: "0 !important",
    },
    panelSummary: {
      fontSize: 14,
    },
    panelDetails: {
      background: theme.palette.background.default,
      borderTop: `solid 1px ${theme.palette.divider}`,
    },
  })
);

/**
 * Settings Component
 */
export default function Settings() {
  const classes = useStyles();

  const settings = [
    {
      key: "譜面設定",
      render: () => <ChartSetting />,
    },
    {
      key: "エディタ設定",
      render: () => <EditorSetting />,
    },
    {
      key: "外部連携",
      render: () => <AssetSetting />,
    },
  ];

  return (
    <>
      {settings.map((setting, index) => (
        <div key={index}>
          <Accordion className={classes.panel}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              className={classes.panelSummary}
            >
              {setting.key}
            </AccordionSummary>
            <AccordionDetails className={classes.panelDetails}>
              {setting.render()}
            </AccordionDetails>
          </Accordion>
          <Divider />
        </div>
      ))}
    </>
  );
}
