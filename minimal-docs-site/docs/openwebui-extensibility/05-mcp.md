---
id: mcp
title: MCP 整合（Model Context Protocol）
sidebar_label: MCP
sidebar_position: 6
---

# MCP 整合

**企業問答PoC 原生支援 Model Context Protocol（MCP）Streamable HTTP**（底層 OpenWebUI 0.6.31 起內建）。意思是：你家有現成的 MCP server（Notion、GitHub、內部 CRM…），**不需要寫 Python Tool 包一層** —— 直接在企業問答PoC 掛設定就能用，一個 MCP server 暴露的多個 tool 會被自動發現並呈給 LLM function-call。

---

## 前置

- OpenWebUI **0.6.31+**
- 設定過 `WEBUI_SECRET_KEY` 環境變數（**OAuth token 跨重啟能保留**的關鍵）
- MCP server 公開 Streamable HTTP endpoint（`POST /mcp`、長連線 SSE-like 格式）

## 設定步驟

1. **⚙️ 管理員設定 → 外部工具** (External Tools)
2. 點 **「+ 新增伺服器」**
3. **Type** 選 `MCP (Streamable HTTP)`（**不是 OpenAPI**，是兩個獨立選項）
4. 填 **Server URL** 與認證
5. 存、必要時重啟

**Docker 內 → Host 機器上的 MCP server**：用 `http://host.docker.internal:<port>` 而不是 `localhost`。

---

## 認證模式

| 模式 | 用途 |
|---|---|
| **None** | 內網無認證伺服器。⚠️ 不要誤選 Bearer 又留空 key |
| **Bearer** | MCP server 需要固定 API token |
| **OAuth 2.1** | MCP server 支援 Dynamic Client Registration（DCR） |
| **OAuth 2.1 (Static)** | 你自己先在 IdP 註冊 client，拿 `client_id` / `client_secret` 來填 |

### OAuth 2.1 (Static) 流程

1. 在你的 IdP（Keycloak / Auth0 / Azure AD）建 client，拿到 `client_id` + `client_secret`
2. OpenWebUI External Tools → 新增 → Type = OAuth 2.1 (Static)
3. 填認證資訊 → 按「Register Client」
4. 存檔；使用者在聊天 + 裡啟用該 tool 時會走 OAuth consent flow（**彈瀏覽器同意畫面**）

⚠️ **OAuth 2.1 的 Tool 不能設為「預設自動啟用」**，因為需要互動式瀏覽器同意。必須 per-chat 手動開。

---

## 使用者啟用方式

MCP 上的每個 tool 預設**不自動開**。使用者在聊天介面：

1. 按輸入框旁的 **`+`** 或整合選單
2. 勾選要啟用的 MCP tools
3. LLM 就能在這次對話 function-call 這些 tool

**Function Name Filter List**（設定 server 時可填）：白名單機制，限制 LLM 只能看到哪些 tools。空字串 = 全部。

---

## Transport 支援

| Transport | OpenWebUI 原生支援 |
|---|:-:|
| **Streamable HTTP** | ✅ |
| **Server-Sent Events (SSE)** | ❌ |
| **stdio** | ❌ |

### mcpo proxy（把 stdio/SSE 轉 OpenAPI）

若你用的 MCP server 只支援 stdio（例：大多數 Claude Desktop 設定檔引用的 server）或 SSE，架 [mcpo](https://github.com/open-webui/mcpo)：

```bash
# 裝
pip install mcpo

# 跑（把 stdio 模式的 MCP server 轉成 OpenAPI）
mcpo --port 8000 -- uvx mcp-server-fetch
```

然後在 OpenWebUI 外部工具裡：
- Type = **OpenAPI**（不是 MCP）
- URL = `http://localhost:8000`

這是官方推薦路線。

---

## 除錯

| 症狀 | 解法 |
|---|---|
| 「Failed to connect to MCP server」 | 檢查 Bearer 有無 key；在 Function Name Filter List 暫加 comma 試 |
| 加 tool 後畫面無限載入 | 類別選錯 —— 是 OpenAPI 被錯放到 MCP，或反之。關掉重加正確類型 |
| OAuth 2.1 tool 設預設失敗 | **不要**設預設，改成使用者 per-chat 手動啟用 |
| `Cannot convert undefined or null to object` | 瀏覽器 console 這訊息通常代表 auth 流程遺漏 client_id/secret |

**驗證連線**：設定頁有「Verify Connection」按鈕，按下去沒爆就是通了。

---

## 與 Tools 的差別

| 面向 | [Tools](./tools)（本地 Python） | MCP |
|---|---|---|
| 寫在哪 | OpenWebUI 容器內 `.py` | 外部服務 |
| 語言 | 只能 Python | 任何（MCP spec 無關語言） |
| 可重用 | 只這家 OpenWebUI | 被多家 MCP client 共享 |
| 認證 | `Valves.api_key` 手動 | OAuth 2.1 標準流程 |
| 分享 | 貼程式碼 / community library | 標準協定，別家軟體拿去就能用 |

**公司內部系統要給多個 AI client 用 → 寫 MCP server**。
**只在 OpenWebUI 用 → 寫 Tool 比較輕**。

---

## 參考

- MCP spec：[modelcontextprotocol.io](https://modelcontextprotocol.io/)
- mcpo（stdio/SSE → OpenAPI 代理）：[github.com/open-webui/mcpo](https://github.com/open-webui/mcpo)
- OpenWebUI MCP docs：[docs.openwebui.com/features/extensibility/mcp](https://docs.openwebui.com/features/extensibility/mcp)
