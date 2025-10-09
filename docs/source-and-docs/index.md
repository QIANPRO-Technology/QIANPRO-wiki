# 原始碼與文件

## GitHub 官方倉庫
- 來源：<https://github.com/facebook/docusaurus>
- `README.md`：快速入門、專案結構、設定檔說明與常用指令。
- `examples/`：提供部落格、文檔、多語系等範例，可作為自訂站點起手式。
- Issues / Discussions：追蹤 roadmap、bug 回報與社群常見問答；遇到問題前先搜尋既有議題。
- Releases：關注重大版本紀錄與破壞性變更，升級前先閱讀。

## 安裝與建立專案
1. 確認本機具備 Node.js 18+ 與可用的套件管理工具（npm、yarn、pnpm）。
2. 建立新站點：
   ```bash
   npx create-docusaurus@latest my-site classic
   ```
   - `my-site` 可替換為專案資料夾名稱。
   - `classic` 範本包含部落格、Docs 與首頁配置。
3. 進入專案資料夾後啟動開發伺服器：
   ```bash
   cd my-site
   npm run start
   ```
4. 常用指令：
   - `npm run start`：啟動本機開發伺服器並支援即時重載。
   - `npm run build`：輸出靜態站點到 `build/` 目錄。
   - `npm run serve`：預覽打包結果。

## 建站
在開始客製化前，可先使用官方指令產生範例站點並進入目錄：

```bash
npx create-docusaurus@latest docs-site classic
cd docs-site
```
- 專案根目錄的 `static/` 會在 build 時原樣複製；可建立 `static/files/` 來存放 PDF、ZIP 等下載檔。
- 如需把檔案放在其他資料夾，可在 Markdown 內用 `/files/xxx.pdf` 或 `<Link to="/files/xxx.pdf">` 連結。

1. **規劃站點結構**：定義 Docs 架構（章節、側邊欄）、Blog 需求與首頁 hero/CTA 內容。
2. **調整設定檔**：在 `docusaurus.config.js` 設定 `title`、`url`、`favicon`、`navbar/footer` 與 `i18n` 需求。
3. **側邊欄與導覽**：
   - 編輯 `sidebars.js` 排列文檔順序，支援自動產生或手動分組。
   - 更新 `navbar.items`、`footer.links`，連結到 Docs、Blog 或外部資源。
4. **內容撰寫**：
   - Docs：在 `docs/` 內新增 Markdown；使用 Front Matter 設定 `id`、`title`、`sidebar_label`。
   - Blog：在 `blog/` 內撰寫文章，日期決定排序。
   - 自訂頁面：於 `src/pages/` 以 React component 撰寫 Landing、表單等特殊頁面。
5. **樣式與佈景**：
   - 使用 `src/css/custom.css` 覆寫色票、字體、版面。
   - 需自訂版型可建立 `src/theme` 夾層覆蓋官方 component。
6. **元件與資源**：將共用 React component 放在 `src/components/`；圖片等放入 `static/img/`。
7. **開發流程**：使用 `npm run start` 做即時檢視，撰寫完成後執行 `npm run build` 確保通過。

## 靜態資源管理
- Docusaurus 會自動提供 `static/` 目錄下的檔案，部署後對應到站點根目錄。
- 建議結構：
  - `static/files/`：放置 PDF、ZIP 等大型檔案。
  - `static/img/`：圖片資源。
- 在 Markdown 中使用 `/files/檔案名稱.pdf` 或 `useBaseUrl` helper 連結靜態檔案。

```bash
mkdir -p static/files
# 例：static/files/manual_v1.pdf、static/files/tool_v2.zip
```

在 Markdown 內這樣連結：

```md
# [下載說明書](./files/manual_v1.pdf)
# [下載工具包](./files/tool_v2.zip)
```

（為什麼放 `static/`？因為 Docusaurus 會原封不動把它們拷貝到輸出目錄 `build/`，網址也就能直接下載。詳見官方說明：<https://docusaurus.io/docs/static-assets>。）

- 大檔案建議開啟 gzip 或 brotli 壓縮、或改存放於 object storage（S3、R2 等）並透過外部連結節省 repo 容量。

## 部署說明
- **Build**：透過 `npm run build` 產生靜態檔案，預設輸出於 `build/`。
- **GitHub Pages**：在 `docusaurus.config.js` 設定 `organizationName`、`projectName`、`deploymentBranch`，使用 `GIT_USER=<github-username> npm run deploy` 推上分支。
- **Vercel / Netlify**：將專案連結到託管平台，建議 build 指令設為 `npm run build`、輸出目錄為 `build`。
- **自家伺服器**：將 `build/` 內容同步至目標伺服器（如 Nginx 靜態目錄），必要時設定壓縮與快取。
- **CI/CD**：可在 GitHub Actions 建立工作流程，於 push 時自動執行 `npm ci && npm run build`，再將結果部署到 Pages 或自己伺服器。

## 延伸資源
- 官方文件入口：<https://docusaurus.io/docs>
- 部署指南：<https://docusaurus.io/docs/deployment>
- 靜態資源說明：<https://docusaurus.io/docs/static-assets>
