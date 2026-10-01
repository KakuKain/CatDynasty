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

- 水墨紙色介面、喵將圖鑑表格與詳細頁；技能表格放在喵將詳情。
- 建築圖鑑、升級條件、喵將和建築雙向關聯。
- 建築、食譜、古寶及家具表格；材料直接顯示於食譜與建築需求。
- 古寶圖鑑、效果標籤、強化資料、喵將和隊伍關聯。
- 家具圖鑑、空間、套裝成員和件數效果。
- 兌換碼狀態、期限與遊戲驗證紀錄。
- 全站搜尋、篩選、隊伍編輯器、喵將比較與建築需求計算。
- 職業／陣營 checkbox 多選篩選；比較工具直接勾選最多三位，不需 Ctrl 或手機原生多選清單。
- 關卡、Boss、系統攻略資料頁。
- GitHub Actions 檢查、靜態建置與 GitHub Pages 部署。

## 資料

14 個模組放在 `data/`，資料結構見 `data/schema.json`。對應的示範資料放在 `data/mock/`，與真實資料隔離，不計入已收錄遊戲資料。範例中的數值、食譜、家具、古寶與代碼不適用於遊戲。

每筆記錄包含 `source`、`sourceType`、`verified`、`gameVersion`、`checkedAt` 與 `notes`。版本使用 `tw` / `cn` / `unknown` / `mock`。未知值填 `null` 或空陣列，不能填入推測數字。

`verified: true` 只表示來源版本已核實；`cn` 絕不表示台版核實。部分只有角色名稱的記錄保留 `verified: false`。每個欄位須依來源核對，原始圖鑑可從詳細頁開啟。

截至 2026-10-01，收錄 11 筆台版喵將、20 筆陸版喵將參考（其中 7 位有官方技能圖鑑）、17 座台版建築、4 座陸版建築參考、3 件台版古寶、6 篇攻略及 12 組待實測兌換碼。同名喵將依版本分開，合計 31 筆版本資料，不是 31 位不同角色，也不是完整遊戲圖鑑。

喵將表格固定為「名稱／等級／職業／陣營／屬性／六藝推薦／研究天賦」。`profession` 是單一字串，`faction` 為武將／文臣／俠士／墨客。舊 `type`、`role` 保留原來源記錄，不再作為介面職業欄位。`sixArtsRecommendations` 與 `researchTalents` 獨立記錄，不從經營技能推導研究天賦。黃阿瑪的輔助、文臣、增益、天（稀有）、鎏金（增加攻擊力百分比）、翰林院已由使用者核對，未知加成數值仍留空。

技能及食材獨立頁面已移除：技能在角色詳情查看，材料在食譜查看。舊技能連結導向擁有者角色，食材連結導向食譜；內部 JSON 與關聯仍供查詢及計算使用。

官網確認 15 種建築名稱；太極殿與部分建築功能來自媒體攻略。台版喵將多為名稱記錄，不沿用陸版屬性。黃阿瑪需太極殿 Lv.5 才能領取、魚燈為御品，已由使用者在遊戲內核對；`confirmations` 只確認列出的欄位，不把整筆記錄改為官方核實。`sources` 保留補充來源與適用範圍。

Lota 代碼全部保留 `verified: false`、`status: unverified`、`lastTestedAt: null`。可複製試用，不計為有效。4 組標示 2026-10-01 到期，來源沒有截止時刻；日期過後自動列為「已過來源期限／已失效」。未提供截止日期不代表永久有效，示範碼、已失效及尚未開始的代碼禁止複製。

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

- [台版官方網站・喵宮百景](https://catdynasty.poseidongame.com/#section3)：建築名稱。
- [SouNova 新手指南（2026-09-16）](https://sounova.com/game/kitty-chronicles-beginner-guide-gameplay-tips)：玩法、台版角色名稱、開服與聯動資訊。網站僅作簡要整理，不轉載全文或文章截圖。
- [Lota 兌換碼與攻略](https://lota.games/zh-hant/game/01a0c82e-9747-721f-8b3d-f9b5cfc69fd5/giftcodes)：代碼清單、來源標示期限及古寶資訊。未經遊戲內實測。

活動日期保留報導時點；開服日數依各伺服器／帳號進度判定。未取得個別家具名稱、套裝、食譜與材料數值，相關資料集仍保留空陣列。

## 第一版界線

尚未收錄的實際食譜、家具、台版技能數值、古寶效果數值與建築升級條件需要可靠來源後再補入。沒有登入、後端、自動爬蟲或 T0/T1 排名。隊伍只儲存於本機瀏覽器，不跨裝置同步。
