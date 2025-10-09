---
id: downloads
slug: /downloads
title: 下載資源範例
---

# 下載資源範例

這個頁面示範如何在 Docusaurus 中連結 static/files/ 內的下載檔。

## 預設結構

`ash
static/
  files/
    manual_v1.pdf
    tool_v2.zip
`

## Markdown 連結

`md
# [下載說明書](./files/manual_v1.pdf)
# [下載工具包](./files/tool_v2.zip)
`

實際連結：

# [下載說明書](./files/manual_v1.pdf)
# [下載工具包](./files/tool_v2.zip)

> 部署後，這些連結會對應到公開網址 /files/manual_v1.pdf 等，因為 static/ 目錄會在 build 時原封不動複製到 uild/。
