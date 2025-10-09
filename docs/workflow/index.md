# 工作流（GitHub + 自家伺服器）

## 本地初始化（一次）
1. 安裝 Node.js 18 LTS（或相容版本），並確認 `npm --version` 可正常執行。
2. 取得專案：
   ```bash
   git clone <repo-url>
   cd QIANPRO-wiki
   ```
   - 若需使用個人 fork，先在 GitHub 建立 fork 再 clone。
3. 安裝依賴：
   ```bash
   npm install
   ```
   - CI 環境建議使用 `npm ci` 以確保鎖定版本。
4. 初始化設定：
   - 若專案提供 `.env.example`，複製為 `.env` 並填入必要變數。
   - 自訂 `docusaurus.config.js` 中的站點名稱、URL、部署分支等。
5. 驗證開發環境：
   ```bash
   npm run start
   ```
   - 瀏覽 <http://localhost:3000>，確認頁面與連結正常。
   - 完成後停止開發伺服器。
6. 建議設定 Git 參數（一次）：
   - `git config core.autocrlf false`（跨平台維持 LF）。
   - `git config commit.template .gitmessage`（若有共用範本）。

## 推到 GitHub（一次）
1. 建立遠端：`git remote add origin <repo-url>`，並以 `git remote -v` 確認設定。
2. 調整預設分支名稱：`git branch -M main`（若本地尚未命名為 main）。
3. 首次提交：`git add .` 後撰寫語意化 commit，例如 `git commit -m "chore: bootstrap wiki"`。
4. 推送到遠端：`git push -u origin main`，建立主要分支的追蹤關係。
5. 在 GitHub 倉庫確認檔案、README 與 Docs 是否正確顯示。
6. 設定必要的保護規則（如 main 分支需要 PR 才能合併）。

### 快速指令小抄

```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/<你的帳號>/<你的repo>.git
git push -u origin main
```
## GitHub 流程
1. **需求規劃**：在 Issues 或 Projects 記錄需求、任務分解與負責人。
2. **建立分支**：以 `feature/<topic>`、`fix/<topic>` 命名，維持 main 分支隨時可部署。
3. **開發與自測**：
   - 安裝依賴：`npm install` 或 `npm ci`
   - 啟動開發環境：`npm run start`
   - 撰寫或更新 Markdown、React component、設定檔。
   - 針對關鍵流程補上測試或文件截圖。
4. **提交與檢視**：撰寫語意化 commit 訊息，推送後建立 Pull Request；在 PR 描述中附上預覽截圖或測試證據。
5. **檢閱**：Reviewer 核可後合併至 main，必要時使用 `squash` 保持歷史整潔。
6. **標籤版本**：重要釋出加上 tag（例如 `v1.2.0`），便於回溯與部署追蹤。

## CI / 構建
- GitHub Actions 範例流程：
  ```yaml
  name: build
  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]
  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 18
            cache: "npm"
        - run: npm ci
        - run: npm run build
        - uses: actions/upload-artifact@v4
          with:
            name: docusaurus-build
            path: build
  ```
- 可在後續部署流程下載 `build` artifact，確保上線版本與測試結果一致。

## 部署到自家伺服器
1. 準備靜態伺服器（Nginx/Apache/Node serve）指向目錄，例如 `/var/www/qianpro`。
2. 建立自動化部署腳本（shell 或 PowerShell）：
   - 從 GitHub Actions 下載 build artifact。
   - 透過 `scp`、`rsync` 或 `ssh` + `tar` 上傳到伺服器。
   - 解壓縮後替換 `build` 目錄，執行健康檢查。
3. 建議保留上一版備份（例如 `build_YYYYMMDDHHmm`），遇到異常可快速回滾。
4. 監控與日誌：設定 web server access/error log 監控工具（ELK、Grafana Loki 等）。

## 本機測試與同步
- 專案同步：`git fetch --all`、`git pull origin main` 確保同步。
- 靜態資源更新需同步於 `static/`，避免漏推。
- 若同時維護語系，建議使用 Crowdin 或 lokalise 之類平台管理翻譯流程。

## 安全與權限
- main 分支加上保護規則（PR review、CI 通過後才能合併）。
- 部署用 PAT 或 Deploy Key 僅授權讀取，伺服器端憑證採用只讀權限。
- 定期更新依賴（`npm outdated`）、使用 Dependabot 或 Renovate 自動開 PR。

## 伺服器部署（重點）

Docusaurus build 後是一組純靜態的 HTML/CSS/JS，沒有 runtime 需求；只要把 `build/` 同步到靜態伺服器即可提供下載（`static/` 內容會原封不動複製到 `build/`）。

### 第一次部署（Ubuntu 例）

伺服器上先安裝 Node.js LTS（18 或 20）：

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

然後執行：

```bash
git clone https://github.com/<你的帳號>/<你的repo>.git /var/www/docs-site
cd /var/www/docs-site/minimal-docs-site
npm ci
npm run build   # 產出到 /var/www/docs-site/minimal-docs-site/build
```

### Nginx 配置（根目錄部署）

```nginx
server {
  server_name docs.example.com;
  root /var/www/docs-site/minimal-docs-site/build;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

> 如果掛在子路徑 `/docs/`，請在 `docusaurus.config.js` 設定 `baseUrl: '/docs/'`，並在 Nginx 加上 `location /docs/ { try_files ... }` 規則。

### 之後更新

```bash
cd /var/www/docs-site/minimal-docs-site
git pull
npm ci          # 若有新套件
npm run build   # build 完成立即生效（Nginx 直接讀靜態檔）
```

### 手動同步範例

- Linux 伺服器：
  ```bash
  rsync -avz --delete build/ user@server:/var/www/qianpro
  ```
- Windows 伺服器：
  ```powershell
  robocopy build \\server\\share\\qianpro /MIR
  ```

### 部署腳本（含版本留存）

```bash
#!/usr/bin/env bash
set -euo pipefail

npm ci
npm run build
tar -czf build.tgz build
scp build.tgz user@server:/tmp/
ssh user@server <<'EOF'
  set -e
  mkdir -p /var/www/qianpro/releases
  cd /var/www/qianpro/releases
  timestamp=$(date +%Y%m%d%H%M%S)
  mkdir $timestamp
  tar -xzf /tmp/build.tgz -C $timestamp --strip-components=1
  rm -f /tmp/build.tgz
  ln -sfn $timestamp /var/www/qianpro/current
  systemctl reload nginx
EOF
```

### 最佳實務

1. **回滾策略**：保留 `/var/www/qianpro/releases/<timestamp>`，異常時把 symlink 指回前一版即可。
2. **快取與壓縮**：啟用 gzip / brotli；對 PDF/ZIP 設長快取、對 HTML 設短快取。
3. **監控與告警**：建立 uptime 檢查、串 Nginx access/error log 與性能指標（Grafana / Prometheus）。
4. **憑證與 HTTPS**：使用 Let’s Encrypt / Certbot 或前端代理（如 Cloudflare）自動續期。
5. **自動化選項**：
   - GitHub Actions 執行 `npm run build` 確認不破，可上傳 artifact 或自動部署。
   - 不自管伺服器時，可直接使用 GitHub Pages 或 Vercel/Netlify。
   - 需要容器化可採 Docker + Nginx，將 `build/` 掛入靜態目錄。

