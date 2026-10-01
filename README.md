# 喵國資料庫 · CatDynasty

《小貓咪大史記》非官方攻略資料庫。台版為主，陸版《貓歌行》資料明確標示為參考。

## 執行

需要 Node.js 24 與 npm。

```sh
npm ci
npm run dev
npm test
npm run build
```

開啟終端顯示的網址。預設基底路徑為 `/CatDynasty/`；最終產物在 `dist/`，沒有常駐後端。

## 已實作

- 首頁、喵將圖鑑與詳細頁、技能與效果反查。
- 建築圖鑑、升級條件、喵將和建築雙向關聯。
- 食譜和食材雙向查詢、來源建築關聯搜尋。
- 古寶圖鑑、效果標籤、強化資料、喵將和隊伍關聯。
- 家具圖鑑、空間、套裝成員和件數效果。
- 兌換碼狀態、期限與遊戲驗證紀錄。
- 全站搜尋、篩選、隊伍編輯器、喵將比較與建築需求計算。
- 關卡、Boss、系統攻略資料頁。
- GitHub Actions 檢查、靜態建置與 GitHub Pages 部署。

## 資料

14 個模組放在 `data/`，資料結構見 `data/schema.json`。對應的示範資料放在 `data/mock/`，與真實資料隔離，不計入已收錄遊戲資料。範例中的數值、食譜、家具、古寶與代碼不適用於遊戲。

每筆記錄包含 `source`、`sourceType`、`verified`、`gameVersion`、`checkedAt` 與 `notes`。版本使用 `tw` / `cn` / `unknown` / `mock`。未知值填 `null` 或空陣列，不能填入推測數字。

`verified: true` 只表示來源版本已核實；`cn` 絕不表示台版核實。部分只有角色名稱的記錄保留 `verified: false`。每個欄位須依來源核對，原始圖鑑可從詳細頁開啟。

目前有 7 位陸版官方完整圖鑑、1 位台版官方部分確認喵將，以及官方推薦隊伍中提及的喵將待補記錄。其他分類尚無可靠資料時，公開資料集保留空陣列。不是完整遊戲圖鑑。

## 增加資料

1. 在對應 JSON 加入穩定且唯一的 `id`，附上來源與版本。
2. 技能放在 `skills.json`，效果引用 `skill-effects.json` 的 `id`。
3. 喵將的 `buildingBonuses` 與建築的 `acceleratingHeroes` 要一致。
4. 食譜用 `ingredientId` 連結食材；家具用 `setId` 連結套裝。
5. 執行 `npm run validate` 檢查 Schema 與所有關聯。

Schema 允許擴充欄位。新增整個資料模組時，加入 JSON、`collectionKeys`、Schema 定義、導覽及對应頁面，現有資料無須搬到「其他」。

## GitHub Pages

目標儲存庫：`KakuKain/CatDynasty`。

1. 將程式碼推送至 `main`。
2. 擁有管理權限的帳號在 Repository → Settings → Pages → Source 選擇 **GitHub Actions**。
3. `.github/workflows/pages.yml` 自動測試並部署 `dist/`。
4. 預計網址：`https://kakukain.github.io/CatDynasty/`。

Hash 路由例如 `/CatDynasty/#/heroes/hero_yang`，重新整理詳細頁不會依賴伺服器重寫。若更改 Repository 名稱，Actions 自動使用新的基底路徑；本機可用 `SITE_BASE_PATH` 覆寫。

## 素材與來源

角色圖像來自《貓歌行》官方 TapTap 圖鑑，僅作角色查詢展示。原圖保留於 `public/images/`，著作權歸原權利人。各記錄直接連到原始官方文章。台版黃阿瑪的角色與品質來源為發行商的 Google Play 介紹。

## 第一版界線

尚未收錄的實際食譜、古寶、家具、台版技能數值與建築升級條件需要提供可靠來源後再補入。沒有登入、後端、自動爬蟲或 T0/T1 排名。隊伍只儲存於本機瀏覽器，不跨裝置同步。
