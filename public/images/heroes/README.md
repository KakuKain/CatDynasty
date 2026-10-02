# 台版喵將透明圖片

本次新增三張角色去背圖，使用內建 imagegen 處理玩家提供的台版截圖，再轉存無損 WebP 並保留透明 alpha。

|角色|原圖檔|截圖來源|
|---|---|---|
|黃月英|hero_huangyueying_tw.webp|LINE_ALBUM_2026102_261002_51.jpg|
|霍去病|hero_huo_tw.webp|LINE_ALBUM_2026102_261002_1.jpg|
|帥波|hero_shuai_tw.webp|LINE_ALBUM_2026102_261002_6.jpg|

來源 SHA-256、完整提示詞及霍去病的邊界修正提示詞存於 `data/sources/hero-cutouts-2026-10-02.json`。移除背景、介面與數字，保留角色造型、馬匹、衣飾及武器；介面遮住的少量輪廓由 imagegen 補齊。

`npm run optimize:images` 會生成 96px 表格縮圖與 640px 抽屜大圖，透明背景保留。生成的壓縮衍生圖不提交 Git，由建置重新產生。原圖可從抽屜中的「查看原尺寸圖片」開啟。

既有 43 張圖片的台版截圖來源見 `data/sources/heroes-2026-10-01.json`。圖像著作權歸遊戲原權利人，僅供資料查詢展示。
