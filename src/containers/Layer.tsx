import {
  Divider,
  IconButton,
  List,
  ListSubheader,
  Menu,
  MenuItem,
} from "@mui/material";
import { Add, ArrowDownward, ArrowUpward, Delete } from "@mui/icons-material";
import { observer } from "mobx-react";
import * as React from "react";
import LayerItem from "../components/LayerItem";
import { useStores } from "../stores/stores";

export default observer(function Layer() {
  const { editor } = useStores();

  const [anchorEl, setAnchorEl] = React.useState<
    HTMLAnchorElement | HTMLButtonElement | null
  >(null);
  const [targetLayerIndex, setTargetLayerIndex] = React.useState<number | null>(
    null
  );

  const open = Boolean(anchorEl);

  function handleSelect(index: number) {
    editor.currentChart!.selectLayer(index);
  }

  function handleToggleVisible(index: number) {
    editor.currentChart!.toggleLayerVisible(index);
  }

  /**
   * レイヤーを結合する
   */
  function handleMergeLayer() {
    editor.currentChart!.mergeLayer();
  }

  const chart = editor.currentChart;

  if (!chart) return <div />;

  return (
    <>
      <List
        component="nav"
        subheader={<ListSubheader component="div">Layers</ListSubheader>}
      >
        {chart.layers.map((layer, index) => (
          <div key={layer.guid}>
            <LayerItem
              layer={layer}
              selected={index === chart.currentLayerIndex}
              onSelect={() => handleSelect(index)}
              onToggleVisible={() => handleToggleVisible(index)}
              onRename={(value: string) => chart.renameLayer(value)}
              onToggleLock={() => chart.toggleLayerLock(index)}
              onGroup={(currentTarget) => {
                setAnchorEl(currentTarget);
                setTargetLayerIndex(index);
              }}
            />
            <Divider />
          </div>
        ))}
      </List>

      {/* グループ */}
      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        {(() =>
          Array.from({ length: 8 }).map((_, index) => (
            <MenuItem
              key={index}
              onClick={() => {
                if (targetLayerIndex !== null) {
                  chart?.setLayerGroup(targetLayerIndex, index + 1);
                }
                setAnchorEl(null);
              }}
            >
              {index + 1}
            </MenuItem>
          )))()}
      </Menu>

      <div>
        <IconButton onClick={() => chart.addLayer()} size="large">
          <Add fontSize="small" />
        </IconButton>
        <IconButton
          disabled={chart.layers.length <= 1}
          onClick={() => chart.removeLayer()}
          size="large"
        >
          <Delete fontSize="small" />
        </IconButton>

        {/* レイヤーアップボタン */}
        <IconButton size="large">
          <ArrowUpward fontSize="small" />
        </IconButton>

        {/* レイヤーダウンボタン */}
        <IconButton size="large">
          <ArrowDownward fontSize="small" />
        </IconButton>

        {/* マージボタン */}
        <IconButton
          disabled={chart.currentLayerIndex == chart.layers.length - 1}
          color="primary"
          onClick={handleMergeLayer}
          size="large"
        >
          <ArrowDownward fontSize="small" />
        </IconButton>
      </div>
    </>
  );
});
