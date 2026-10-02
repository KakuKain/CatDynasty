# 喵將抽屜設計驗收 — 2026-10-02

- Source visual truth: C:/Users/FE008/.codex/generated_images/01a0f502-fd8d-7003-b747-acda04c75b47/exec-7321434e-f87c-46e6-9d59-b787dc488609.png
- Selected design: first displayed ideation result (玩家已選定第一版).
- Source pixels: 1704 × 923, no browser chrome.
- Intended viewport: 1920 × 1040 CSS px, desktop, density 1.
- Intended state: #/heroes, 秦始皇 detail drawer open, ultimate skill expanded.
- Implementation screenshot path: unavailable.
- Implementation pixels / density normalization: unavailable; no visual comparison performed.
- Full-view comparison evidence: blocked.
- Focused-region comparison evidence: blocked.
- Blocker: prior in-app browser requests to the local app and deployed CatDynasty site were denied; those accesses are not retried or bypassed.

## Fidelity surfaces

- Fonts / typography: code retains LXGW WenKai TC and uses compact 14–16px content; rendered wrapping and font loading not verified.
- Spacing / layout: implemented compact illustration/facts region, six snapshot stats in three columns, skill accordion, responsive layout below 700px and 480px; visual density not verified.
- Colors / tokens: code reuses parchment, ink green and vermilion; rendered appearance not verified.
- Image quality: existing optimized transparent game art reused with contain and centered positioning; all supplied skill icons use screenshot pixels rather than generated art.
- Copy / content: existing verified database descriptions retained; generated mock text and fictional skill illustrations excluded. Unknown fields and screenshot progress context retained.

## Interaction checks

- Skill expand/collapse uses native details/summary.
- Existing hero/skill drawer links, close/back actions, team add handler and filters retained.
- Profession and faction remain separate source fields and separate multi-select filters; table presentation combines them on two lines.
- Browser interactions and console errors: not checked due access blocker.
- Renderer smoke check: all 66 TW/CN hero detail outputs generated without missing values; all 122 linked skill descriptions retained; combined table has nine columns. This is HTML output validation, not a browser test.
- npm test: 33 passed.
- npm run build: passed, 530 records validated.
- Build and unit tests are not visual acceptance.

## Comparison history

### User-provided pre-fix implementation, 2026-10-02

- Implementation evidence: C:/Users/FE008/AppData/Local/Temp/codex-clipboard-52672a46-758a-4198-954d-9de4473160d4.png
- Implementation pixels: 1920 × 1032 including browser chrome; app starts at y=120, right drawer at x=980. This evidence is the prior deployment, not the revised build.
- Selected reference and user screenshot were opened in the same tool response for pre-fix inspection.
- [P1] Missing ink-wash backdrop: revised code uses a 17,846-byte generated paper landscape backdrop.
- [P1] Portrait and typography too small: revised code uses a 340px illustration column, 280px contained art height, vertical character inscription, 32px drawer title, 20px skill names, approximately 16px explanations.
- [P2] Weak metadata/stat hierarchy: revised code adds Phosphor icons, larger numbers, source-date caption and a vermilion divider.
- User correction: generated skill emblems removed. All 98 available skill/talent icons directly cropped from the user's original screenshots (24 heroes), with source hashes and crop coordinates recorded. No skill artwork generated or redrawn.
- Crop evidence inspected: .qa/skill-icons/rows.png, .qa/skill-icons/final-icons.png, .qa/skill-icons/li-skills.png. Li Chunfeng icon mapping confirmed: 言兆 third image, 周算 second image.
- All original skill icons total 342,660 bytes. Unknown skill imagery uses a neutral standard icon, without assigning another hero's game icon.
- Revised HTML output checked: 66 hero profiles, all 122 linked descriptions retained, original icons present where supplied.
- Post-fix browser screenshot and interaction checks remain blocked by the existing browser access denial. Code corrections and image checks do not imply a visual acceptance pass.

## Implementation checklist

- Obtain an authorized browser capture at the intended state and viewport.
- Compare against the selected source, including mobile wrapping, accordion controls, image crop, keyboard focus and nested drawer navigation.
- Fix actionable P0/P1/P2 findings and repeat comparison.

final result: blocked

## 分類與數值圖示 — 2026-10-02

- 玩家要求新增職業、屬性、陣營、六藝推薦，以及生命、攻擊、防禦、速度、戰力、經營圖示。
- 10 枚圖示使用內建 imagegen 製作，保存為 96px 透明 WebP，合計 53,244 bytes。
- .qa/profile-icons/preview.png 已檢查：96px 素材與實際 32px 尺寸同時呈現，符號可辨識、無底色矩形，風格為水墨綠／淡金，生命使用朱紅。
- 全部素材 alpha 最小值 0、最大值 255；固定寬高避免載入時位移。手機數值圖示縮為 24px，分類圖示 28px。
- 僅替換分類／數值標籤圖示，技能與天賦仍使用原始截圖。網頁實際渲染驗收仍受既有瀏覽器存取限制，未宣稱視覺驗收通過。
