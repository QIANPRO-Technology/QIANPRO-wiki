---
id: overview
title: OpenWebUI 擴充開發指南 — 總覽
sidebar_label: 總覽
sidebar_position: 1
---

# OpenWebUI 擴充開發指南

整理自官方文件 [docs.openwebui.com/features/extensibility](https://docs.openwebui.com/features/extensibility/)。本指南以繁體中文重構，鎖定 **OpenWebUI 0.5+** 的三大擴充入口與兩套外部整合。目標讀者：公司內要動手寫 Agent、Tool、或整合外部系統的工程師。

---

## 擴充體系全圖

OpenWebUI 的擴充分三層：

1. **Plugin（Python，同進程）** — 寫在 OpenWebUI 容器內、重啟即生效。包含四個子類：
   - [Tools](./tools) — LLM 用 function calling 呼叫的方法
   - [Pipe Functions](./pipe-functions) — 自製模型 / Agent（在模型下拉出現）
   - [Filter Functions](./filter-functions) — middleware（訊息進出攔截）
   - [Action Functions](./action-functions) — 訊息上的互動按鈕
2. **外部 HTTP 整合**
   - [MCP（Streamable HTTP）](./mcp) — Model Context Protocol 伺服器
3. **獨立 Worker**
   - [Pipelines](./pipelines) — 外部 Python 服務（port 9099），重運算離線跑

---

## 什麼情境選哪個

| 需求 | 推薦 | 原因 |
|---|---|---|
| 讓 LLM 調外部 API / 算個東西 | **Tool** | type hints 自動生成 schema，Native Function Calling 開就能用 |
| 做一個「模型」讓使用者選 | **Pipe** | 可完整接管請求流程，也能透過 `pipes()` 暴露多變體（Manifold） |
| 全站自動加系統提示、過敏感字 | **Filter（global）** | inlet/stream/outlet 三階段攔截 |
| 讓使用者在某模型可選開關 | **Filter（toggle）** | `toggle=True` 出現在 ⚙️ 整合選單 |
| 訊息下加「匯出 PDF」「重譯」按鈕 | **Action** | 按鈕 + `__event_call__` 彈窗問參數 |
| 接現有 MCP 伺服器 | **MCP** | Streamable HTTP 直連，OAuth 2.1 支援 |
| 很吃 CPU/GPU 的模型推論 / RAG | **Pipelines** | 獨立 container，不拖累主站 |

---

## 四大 Plugin 類別對照

| 類別 | 類別名 | 必備方法 | 觸發時機 | 出現位置 |
|---|---|---|---|---|
| **Tool** | `class Tools` | `async def <任何 public method>` | 模型 function-call 時 | 工作區 → Tools / 模型 → 勾選 |
| **Pipe** | `class Pipe` | `async def pipe(body)` | 使用者選此模型送訊息時 | 模型下拉 |
| **Filter** | `class Filter` | `inlet` / `stream` / `outlet` | 每次請求或每個 token | 自動執行（含 toggle） |
| **Action** | `class Action` | `async def action(body)` | 點訊息上按鈕 | 訊息工具列 |

**共同機制**：
- 都支援 `Valves`（管理員級設定）和 `UserValves`（使用者級偏好）
- 都能注入 `__user__`、`__event_emitter__`、`__files__`、`__metadata__`、`__model__`、`__request__` 等
- 都在容器啟動時掃 docstring 裡的 `requirements:` 自動 pip install

---

## 共通 Docstring 前言

所有 Plugin 檔頭都用三引號 docstring 宣告 metadata。這是 OpenWebUI 解析的來源，不能省：

```python
"""
title: 顯示名稱
author: your-name
author_url: https://...
git_url: https://github.com/...
description: 一句話說明
required_open_webui_version: 0.5.0
requirements: pandas,matplotlib
version: 0.1.0
licence: MIT
"""
```

`requirements` 會在載入時自動 `pip install`；注意多工環境（多個 worker 啟動）可能踩版本衝突，**正式環境建議把套件 bake 進 image** 並設 `ENABLE_PIP_install_FRONTMATTER_REQUIREMENTS=False`。

---

## 注入參數一覽（dunder args）

以下參數**依需要宣告在方法簽名上**，框架會自動注入。用不到就不要宣告。

| 參數 | 類型 | 內容 | Tool | Pipe | Filter | Action |
|---|---|---|:-:|:-:|:-:|:-:|
| `body` | `dict` | 完整請求 body（messages、model、metadata...） | — | ✅ | ✅ | ✅ |
| `__user__` | `dict` | `{id, email, name, role, valves}` | ✅ | ✅ | ✅ | ✅ |
| `__event_emitter__` | `callable` | 發 status / citation / notification 事件 | ✅ | ✅ | ✅ | ✅ |
| `__event_call__` | `callable` | **彈窗向使用者要輸入**（confirmation / input） | ✅ | — | — | ✅ |
| `__files__` | `list` | 對話附加檔案 | ✅ | ✅ | ✅ | — |
| `__request__` | `fastapi.Request` | 原始 FastAPI request 物件 | ✅ | ✅ | ✅ | ✅ |
| `__metadata__` | `dict` | `{interface, chat_id, session_id, function_calling, ...}` | ✅ | ✅ | ✅ | ✅ |
| `__model__` | `dict` | 當前模型資訊 + `info.base_model_id` | ✅ | ✅ | ✅ | ✅ |
| `__messages__` | `list` | 歷史訊息陣列 | ✅ | ✅ | — | — |
| `__task__` / `__task_body__` | `dict` | OpenWebUI 內部任務資訊 | — | ✅ | — | — |
| `__oauth_token__` | `dict` | 使用者自動刷新過的 OAuth token | ✅ | ✅ | — | — |
| `__chat_id__` | `str` | 對話 ID（也在 `__metadata__`） | — | ✅ | ✅ | — |

---

## Valves 與 UserValves

兩個都繼承 `pydantic.BaseModel`，差在生效範圍：

```python
class Tools:      # 或 Pipe / Filter / Action
    class Valves(BaseModel):                       # 管理員層級
        api_key: str = Field("", description="...")

    class UserValves(BaseModel):                   # 使用者層級
        language: str = Field("zh-TW", description="...")

    def __init__(self):
        self.valves = self.Valves()

    async def do_stuff(self, __user__: dict) -> str:
        shared_cfg = self.valves.api_key
        personal   = __user__.get("valves")        # UserValves 實例在這
```

- `Valves` → 管理員控制台 → Functions / Tools → 點開該項 → 上方表單
- `UserValves` → 使用者個人設定 → Functions / Tools → 對應表單

欄位用 `Field(default, description=...)` 會自動生成 UI，**不用寫前端程式**。

---

## Native vs Default Function Calling

這是整個擴充系統最容易踩到的設計細節：

| 模式 | 機制 | 速度 | 圖靈範圍 | `message` 事件 | `status` 事件 |
|---|---|---|---|:-:|:-:|
| **Native（Agentic）** | Tool schema 直接注入 OpenAI function 參數 | 快（KV cache 保留） | 只有有 function calling 支援的模型 | ❌（會被覆蓋） | ✅ |
| **Default（Legacy）** | Tool 清單 prompt-inject 到系統訊息 | 慢（破壞 KV cache） | 任何模型 | ✅ | ✅ |

**選 Native**：Gemma 4、Qwen 3 LLaMA.cpp 後端多半支援，首選。

**選 Default**：舊模型或 prompt-engineering 要微調 tool 挑選邏輯時才退回。

⚠️ **進 Native 模式後**：`message` / `replace` 事件會被 native completion snapshot 蓋掉。要顯示中間訊息**改用 `status` 事件**（例：`"產圖中…"`），不要 yield markdown 片段。

---

## 目錄

1. [Tools](./tools)
2. [Pipe Functions](./pipe-functions)
3. [Filter Functions](./filter-functions)
4. [Action Functions](./action-functions)
5. [MCP 整合](./mcp)
6. [Pipelines（獨立 worker）](./pipelines)
7. [常見反官方寫法與修法對照](./common-pitfalls)

---

## 參考

- 官方總覽：[docs.openwebui.com/features/extensibility](https://docs.openwebui.com/features/extensibility/)
- 社群 Tools / Functions 庫：[openwebui.com/search](https://openwebui.com/search)
- Pipelines repo：[github.com/open-webui/pipelines](https://github.com/open-webui/pipelines)
- mcpo（stdio/SSE → OpenAPI 轉換代理）：[github.com/open-webui/mcpo](https://github.com/open-webui/mcpo)
