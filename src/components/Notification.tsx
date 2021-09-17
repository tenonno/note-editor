import { observer } from "mobx-react";
import { withSnackbar, WithSnackbarProps } from "notistack";
import * as React from "react";
import { useStores } from "../stores/stores";

/**
 * 通知用コンポーネント
 */
const Notification = observer((props: WithSnackbarProps) => {
  const { editor } = useStores();
  editor.setEnqueueSnackbar(props.enqueueSnackbar);
  return <></>;
});

export default withSnackbar(Notification);
