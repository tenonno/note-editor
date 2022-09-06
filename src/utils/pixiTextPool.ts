import { Graphics, Text, TextStyle } from "pixi.js";
import { isEqual } from "lodash";

export default class PixiTextPool {
  private tempTextIndex = 0;
  private temporaryTexts: Text[] = [];

  public update() {
    // 一時テキストを削除
    for (const temp of this.temporaryTexts) {
      temp.visible = false;
    }
    this.tempTextIndex = 0;
  }

  public drawText(
    graphics: Graphics,
    text: string,
    x: number,
    y: number,
    option?: any,
    maxWidth?: number,
    offset = [0.5, 0.5]
  ): Text {
    if (this.tempTextIndex >= this.temporaryTexts.length) {
      const t = new Text("");
      graphics.addChild(t);
      this.temporaryTexts.push(t);
    }

    const t: Text & {
      // 前フレームのスタイル
      previousStyleOptions?: any;
      previousMaxWidth?: number;
    } = this.temporaryTexts[this.tempTextIndex];

    t.anchor.set(offset[0], offset[1]);

    // .text か .style に値を代入すると再描画処理が入るので
    // 前フレームと比較して更新を最小限にする
    if (
      t.text !== text ||
      !isEqual(t.previousStyleOptions, option) ||
      t.previousMaxWidth !== maxWidth
    ) {
      t.text = text;
      t.style = Object.assign(
        {
          fontFamily: "'Noto Sans JP', sans-serif",
          align: "center",
          fontSize: 20,
          fill: 0xffffff,
          dropShadow: true,
          dropShadowBlur: 8,
          dropShadowColor: "#000000",
          dropShadowDistance: 0,
        },
        option
      ) as TextStyle;

      // 拡大率をリセットして文字の横幅を算出する
      t.scale.x = 1;
      if (maxWidth !== undefined) {
        t.scale.x = Math.min(1, maxWidth / t.width);
      }

      t.previousStyleOptions = option;
      t.previousMaxWidth = maxWidth;
    }
    t.x = x;
    t.y = y;

    t.visible = true;

    this.tempTextIndex++;

    return t;
  }
}
