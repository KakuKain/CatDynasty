# 古寶透明圖片

來源：玩家提供的古寶詳情與滿星圖鑑截圖 `LINE_ALBUM_2026101_261001_1.jpg` 至 `_94.jpg`。第 95 至 136 張為第 1 至 42 張的相同檔案，未重複處理。

處理方式：內建 imagegen，background-extraction；逐張輸出透明 PNG，再無損封裝為 WebP，保留 alpha。共 94 件，每件均在 `public/images/artifacts/<artifact-id>.webp`。輸出並非官方原始素材。

共用提示詞：

```text
Use case: background-extraction. Edit target: this game screenshot. Produce a clean faithful cutout of ONLY the central treasure illustration, including its original ground/base. Remove the entire game interface, title, text, seal, buttons, pale cream background and distant scenery. Preserve the exact original shapes, outlines, colors, proportions, orientation and all components. Do not redesign or embellish. Do not include the blue cat emblem at top-left or book icon at top-right. Center the complete original treasure on a square canvas with modest transparent margins. Real transparent alpha PNG; no background, no checkerboard, no added shadow.
```

風箏園（第 1 張）另指定保留風箏、線軸、花朵與原有地板。

第 43 至 94 張為滿星圖鑑預覽，表格按截圖中的效果與生效上限收錄，抽屜保留預覽說明與圖鑑原始數量。第 1 至 42 張為原有詳情截圖，數值與帳號進度保留。

對應截圖與文字資料：`data/sources/artifacts-2026-10-01.json`。圖像著作權屬遊戲原權利人。
