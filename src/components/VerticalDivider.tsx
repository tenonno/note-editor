import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import { Theme } from '@mui/material/styles';
import * as React from "react";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    divider: {
      width: 1,
      background: theme.palette.divider,
    },
  })
);

export default function VerticalDivider() {
  const classes = useStyles();
  return <div className={classes.divider} />;
}
