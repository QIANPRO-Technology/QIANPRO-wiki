# Minimal Docs Site

這個目錄提供一個最小可執行的 Docusaurus 專案範例，示範：

- 如何放置下載檔 (static/files/…)
- docusaurus.config.js 的 url / aseUrl 範例
- 首次部署到自管伺服器的流程與 Nginx 設定

## 目錄結構

`
minimal-docs-site/
├─ blog/
├─ docs/
│  ├─ intro.md
│  └─ downloads.md      # 下載頁面範例
├─ deploy/
│  └─ nginx.conf        # 根目錄部署設定示例
├─ src/
├─ static/
│  ├─ files/
│  │  ├─ manual_v1.pdf  # 下載範例檔（請換成正式檔案）
│  │  └─ tool_v2.zip    # 下載範例檔（請換成正式檔案）
│  └─ img/
├─ docusaurus.config.js
├─ package.json
└─ README.md
`

## 建站（本機一次）

`ash
npm install
npm run start
`

- 預設在 http://localhost:3000 預覽
- 可依需求調整 src/pages/、docs/ 等內容

## 正式打包

`ash
npm run build
`

- 打包輸出在 uild/
- 可使用 
pm run serve 進行離線預覽

## 靜態檔下載示範

在 Markdown 裡可直接連結 static/files 下的檔案：

`md
# [下載說明書](./files/manual_v1.pdf)
# [下載工具包](./files/tool_v2.zip)
`

參考 docs/downloads.md 取得實際頁面範例。

## 首次部署到自管伺服器（Ubuntu 例）

伺服器需先安裝 Node.js LTS（18/20）：

`ash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
`

然後：

`ash
sudo git clone https://github.com/<你的帳號>/<你的repo>.git /var/www/docs-site
cd /var/www/docs-site/minimal-docs-site
npm ci
npm run build
`

- Nginx 根目錄部署可參考 deploy/nginx.conf
- 若部署在子路徑 /docs/，請同步調整 docusaurus.config.js 的 aseUrl 以及 Nginx location /docs/ 規則

## 之後更新

`ash
cd /var/www/docs-site/minimal-docs-site
git pull
npm ci        # 如果 package-lock.json 有更新
npm run build # build 完立即生效（Nginx 直接讀靜態檔）
`

## 自動化選項

1. **GitHub Actions**：在專案中新增 workflow，於每次 push 執行 
pm run build 確認不破。可進一步上傳 artifact 或自動部署。
2. **GitHub Pages**：若不自管伺服器，可直接照官方教學部署到 Pages。
3. **Docker + Nginx**：可用 multi-stage build 產出 uild/，再由 Nginx 容器提供靜態檔（社群已有多種範例）。

## 小抄

- 建站：
px create-docusaurus@latest my-site classic
- 本地預覽：
pm run start
- 正式打包：
pm run build（輸出在 uild/）
- 放下載檔：static/files/...（Markdown 連 ./files/xxx.pdf）

> 若要把這個範例直接當專案使用，記得更新 package.json、docusaurus.config.js、static/files/ 內容，並將 manual_v1.pdf / 	ool_v2.zip 換成實際檔案。
