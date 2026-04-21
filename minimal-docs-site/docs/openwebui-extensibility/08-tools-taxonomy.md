---
id: tools-taxonomy
title: Tools 全分類 — Workspace vs 外部工具
sidebar_label: Tools 全分類
sidebar_position: 2
---

# Tools 全分類

很多人（包含我）一開始以為「Tools 就是一個東西」，其實 OpenWebUI 的 **Tools 是一個傘狀概念**，底下包含 **六種不同實作**。放在不同 UI 位置、走不同協定、安全性也不一樣。這一篇把六類**一次講清楚**，後面寫 Plugin 時才不會混淆。

---

## 六類 Tools 一覽

| 類型 | UI 位置 | 執行位置 | 協定 | 本質 |
|---|---|---|---|---|
| 1. **Native Features** | ⚙️ 內建開關 | OpenWebUI 容器內 | 框架內部 | 平台本身寫死的功能 |
| 2. **Workspace Tools** | 工作區 → Tools | OpenWebUI **容器內** | Python class Tools | 管理員寫的 `.py` 腳本 |
| 3. **Native MCP (HTTP)** | 管理員 → 外部工具 | **外部 server** | MCP Streamable HTTP | 跑遠端 MCP 伺服器 |
| 4. **MCP via MCPO Proxy** | 管理員 → 外部工具 | 外部 stdio + MCPO | stdio / SSE → OpenAPI | 把 Claude Desktop 類的 MCP 轉進來 |
| 5. **OpenAPI Servers** | 管理員 → 外部工具 | 外部 REST API | OpenAPI / REST | 任何符合 OpenAPI spec 的服務 |
| 6. **Open Terminal** | Settings → Integrations | 獨立 Docker container | Shell | 給 LLM 的 sandboxed shell（需另部署） |

---

## 1. Native Features（平台內建）

OpenWebUI **核心程式碼**裡寫死的功能，不是 plugin。在**模型設定 / 使用者設定**裡有勾選開關：

- 網路搜尋 (Web Search)
- URL 抓取 (Fetch URL)
- 圖片生成
- 記憶 (Memories)
- RAG 檢索（Knowledge）
- Code Interpreter（pyodide 沙盒）
- 筆記 (Notes)
- 對話歷史 (Chats)

**Native Mode + 支援 function calling 的模型**時，這些會自動以標準 tool schema 注入給模型，LLM 可以直接呼叫（例：`search_web`、`query_knowledge_files`）。

---

## 2. Workspace Tools（你寫的 Python）

**執行位置**：OpenWebUI **容器內部**，與主站同進程。
**寫在哪**：工作區 → Tools → 貼 `.py` 原始碼。
**安裝入口**：上傳 Python / 從社群庫 `openwebui.com/search` 匯入。

```python
"""
title: Weather Tool
requirements: httpx
"""
from pydantic import BaseModel

class Tools:
    class Valves(BaseModel):
        api_key: str = ""

    async def get_weather(self, city: str) -> str:
        """查指定城市的即時天氣。"""
        ...
```

**特色**：
- 能 access OpenWebUI 內部模組（`open_webui.models.*`、`generate_chat_completion`）
- 能讀寫 `/app/backend/data/`
- type hints → auto JSON schema
- Valves / UserValves 表單自動生成

**詳見**：[Tools 開發指南](./tools)。

---

## 3. Native MCP (Streamable HTTP)

**執行位置**：**外部** MCP server（可能在同台機、可能跨機、可能雲端）。
**OpenWebUI 版本要求**：0.6.31+
**設定入口**：管理員設定 → 外部工具 → `+ 新增` → Type 選 **「MCP (Streamable HTTP)」**。

```
OpenWebUI  ──  HTTP POST /mcp  ──>  你家 MCP server
            <──  JSON-RPC over SSE
```

**特色**：
- 不用寫任何 Python
- MCP server 可用任何語言（Node、Rust、Go...）
- **支援 OAuth 2.1**（含 DCR 與 static client）
- 一個 MCP server 暴露多個 tool，OpenWebUI 自動發現

**典型使用場景**：Notion / GitHub / Linear 官方 MCP server 直連。

**詳見**：[MCP 整合](./mcp)。

---

## 4. MCP via MCPO Proxy

**背景**：很多現成的 MCP server（Claude Desktop 那些 `mcp-server-*`）只支援 **stdio transport**，OpenWebUI 吃不到。

**解法**：架一支 [mcpo](https://github.com/open-webui/mcpo)，把 stdio MCP **轉成 OpenAPI 端點**：

```
OpenWebUI  ──  HTTP (OpenAPI)  ──>  mcpo  ──  stdio  ──>  mcp-server-fetch
                                   (port 8000)
```

**設定入口**：管理員設定 → 外部工具 → Type 選 **「OpenAPI」**（**不是** MCP！注意），URL 指向 mcpo。

```bash
# 跑 mcpo 把 stdio MCP 轉 OpenAPI
pip install mcpo
mcpo --port 8000 -- uvx mcp-server-fetch
```

**什麼時候用**：你想用的 MCP server 沒有官方 HTTP 變體，只有 stdio 版時。

---

## 5. OpenAPI Servers（純 REST API）

**執行位置**：外部任何符合 **OpenAPI 3.x spec** 的 REST 服務。
**設定入口**：管理員設定 → 外部工具 → Type 選 **「OpenAPI」**。

OpenWebUI 會去抓 `/openapi.json`（或指定路徑），**自動把 endpoint 變成一個個 tool**，schema 從 spec 裡解出來。

**典型使用場景**：
- 公司既有的 ERP / CRM REST API
- 自己用 FastAPI / Swagger 寫的微服務
- 公開 API（天氣、股票、翻譯等）只要有 OpenAPI spec

**與 MCP 的差別**：

| 面向 | MCP (Streamable HTTP) | OpenAPI |
|---|---|---|
| 協定 | JSON-RPC + SSE | 純 REST |
| 規格 | MCP spec | OpenAPI 3.x |
| 認證 | 支援 OAuth 2.1 原生 | 依服務，OpenWebUI 支援 Bearer |
| 工具發現 | MCP `tools/list` 動態 | `/openapi.json` 靜態 |
| 適合 | Agent 專用協定伺服器 | 現有 REST API 套進來 |

**企業內部系統整合通常選 OpenAPI**（因為公司既有 API 多半本來就符合 OpenAPI，不用重寫）。

---

## 6. Open Terminal

**不是**企業版獨有，是一個**獨立 repo 的整合**：[github.com/open-webui/open-terminal](https://github.com/open-webui/open-terminal)。需要另外部署那個 container，再到 OpenWebUI 的 `Settings → Integrations` 啟用。

啟用後，隔離的 Docker container 裡開 shell 給 LLM 用，等於把「沙盒裡的 bash」變成 tool：

- 比 Code Interpreter 強（能裝任何 Linux 工具、能留檔）
- 比 Workspace Tool 彈性（LLM 自己想 command，不用事先寫好 method）
- 比 Workspace Tool 危險（必須嚴格 container 隔離；LLM 若被 prompt injection 可能變成 RCE 通道）

**使用場景**：做**互動式 DevOps agent**（查 log、跑 ansible、debug Linux 配置）、或**讓 LLM 自己 pip install 跑實驗**這種探索型工作。一般企業問答用不到。

---

## 快速決策樹

```
想做什麼？
│
├─ LLM 要查天氣 / 查股票之類通用需求
│   └─ 勾 Native Feature（網路搜尋）即可
│
├─ 要接自家 ERP / CRM 已經有 REST API
│   └─ OpenAPI Server（不用寫 Python）
│
├─ 有現成 MCP server（官方 Notion / GitHub）
│   └─ Native MCP (HTTP)
│
├─ 想用 stdio 的 MCP server（Claude Desktop 那套）
│   └─ 架 MCPO → 設為 OpenAPI
│
├─ 邏輯複雜 / 要讀 OpenWebUI 內部狀態 / 要產圖
│   └─ Workspace Tool（Python class Tools）
│
└─ 要讓 LLM 跑任意 bash command
    └─ Open Terminal（另部署 container）
```

---

## Workspace Tools vs External Tools 常見誤解

**誤解**：「Tools 就是 Tools，差別只是在哪裡啟用」
**正解**：底層完全不同東西。Workspace Tools 是**你家 OpenWebUI 容器跑的 Python**；External Tools 是**呼叫外部服務**。

**影響**：
- **資料隱私**：Workspace Tools 處理的資料**留在你家伺服器**；External Tools 會把 function 參數送到外部服務。
- **效能**：Workspace Tools 跟主站同進程，latency 低但吃 OpenWebUI 的 CPU/RAM；External 走網路。
- **維護**：Workspace Tools 你要自己寫、自己 pip；External 只要 server 規格穩，OpenWebUI 這邊幾乎零維護。
- **安全**：Workspace Tools 能 access 主站內部資料（可能好可能壞）；External 是隔離邊界清楚。

---

## 對應 UI 路徑速查

| 想設定… | 路徑 |
|---|---|
| 開關 Native Features | 管理員設定 → 介面 / 模型編輯 → Capabilities |
| 管理 Workspace Tools | 工作區 → Tools |
| 新增 MCP / OpenAPI 伺服器 | **管理員設定 → 外部工具** (External Tools) |
| 把 Tool 綁到某個模型 | 工作區 → Models → 編輯 → Tools 區 |
| 對話中臨時啟用 | 聊天輸入框 `+` → 選 Tools |

---

## 小結

Tools 不是單一種東西。**企業內部系統整合 90% 會是「OpenAPI Server」而不是 Workspace Tools**（因為既有 API 套進來最快）。Workspace Tools 留給**需要存取 OpenWebUI 內部狀態、或產圖/產檔的重邏輯**。MCP 則適合**跨家軟體共用的第三方服務**。

這一篇看完，其他幾頁（[Tools 開發](./tools)、[MCP](./mcp)）要講的就是各類型的實作細節。
