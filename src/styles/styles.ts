import { Theme } from "@mui/material";

import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';

export const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    input: {
      fontSize: 14,
      marginTop: -4,
    },
    label: {
      fontSize: 16,
    },
    table: {
      outline: 0,
      padding: theme.spacing(2),
    },
  })
);
