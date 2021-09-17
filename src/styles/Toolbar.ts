import { Theme } from "@mui/material";

import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    toggleButton: {
      height: 32,
    },
    toggleContainer: {
      padding: `${theme.spacing()} ${theme.spacing(2)}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
    },
  })
);

export default useStyles;
