---
id: pipe-functions
title: Pipe Functions（自製模型 / Agent）
sidebar_label: Pipe Functions
sidebar_position: 3
---

# Pipe Functions

**企業問答PoC 具有自製模型 / Agent 特性** —— 透過 Pipe Function，開發者可撰寫一支類別上傳，它會出現在企業問答PoC 頂部的模型下拉選單；使用者選擇後即直接進入該 `pipe()` 函式，由開發者**完整接管整個對話流程**（LLM 呼叫、圖表產生、狀態機、tool-loop 等自行決定）。

企業問答PoC 的 Pipe 典型用途：
- 包裝新 LLM 供應商（例：Anthropic、本地 gguf）
- 做 Agent / workflow（自己管 tool-loop、狀態機）
- 接非 LLM 介面（智慧家居、資料庫查詢）
- 當 proxy / router（根據 body 內容轉到不同後端）

公司內部實例：`process_insight` Pipe（製程數據洞察 Agent）就是走這條路做的。

---

## 最小模板

```python
"""
title: 我的 Agent
author: your-name
description: 一句話描述
required_open_webui_version: 0.5.0
requirements: httpx
version: 0.1.0
"""

from pydantic import BaseModel, Field
from fastapi import Request


class Pipe:
    class Valves(BaseModel):
        target_model: str = Field(
            default="gemma-4-26B-A4B-it-UD-Q4_K_M.gguf",
            description="底層要轉發的模型 id",
        )

    def __init__(self):
        self.valves = self.Valves()

    async def pipe(
        self,
        body: dict,
        __user__: dict = None,
        __request__: Request = None,
    ) -> str:
        print(self.valves, body)
        return "Hello from my Pipe"
```

---

## `pipe()` 方法簽名

```python
async def pipe(
    self,
    body: dict,                     # 完整 request body（messages / model / stream 等）
    __user__: dict = None,          # 使用者資訊（id, email, name, role, valves）
    __request__: Request = None,    # FastAPI request 物件（若要呼叫內部 LLM 必需）
    __files__: list = None,         # 對話附加檔案清單
    __event_emitter__=None,         # 發 status/message 事件
    __task__: dict = None,          # 任務中繼資訊
    __task_body__: dict = None,     # 任務 body
    __messages__: list = None,      # 歷史訊息
) -> str | dict | AsyncGenerator:
    ...
```

---

## 回傳值

| 型別 | 行為 |
|---|---|
| `str` | 一次性訊息顯示 |
| `dict` | 結構化 response（會被當 OpenAI-format 回傳） |
| `AsyncGenerator[str]` / `Iterator` | **串流**，每個 yield 變一個 chunk |
| `StreamingResponse` | 完全自訂 SSE |
| `None` | 純副作用操作 |

**串流範例**：

```python
async def pipe(self, body: dict):
    if body.get("stream"):
        async def gen():
            yield "第一段\n"
            yield "第二段\n"
        return gen()
    return "非串流一次回完"
```

---

## Manifold（一支 Pipe 暴露多個模型）

加一個 `pipes()` 方法回傳 model dict 陣列，**一個 Pipe 檔就能長出多個選項**：

```python
class Pipe:
    def pipes(self):
        return [
            {"id": "aoi-analyst",  "name": "AOI 瑕疵分析師"},
            {"id": "sales-report", "name": "銷售報表分析師"},
            {"id": "iot-analyst",  "name": "IoT 感測器分析師"},
        ]

    async def pipe(self, body: dict):
        variant = body["model"].split(".")[-1]  # 取出子模型 id
        if variant == "aoi-analyst":
            ...
        elif variant == "sales-report":
            ...
```

模型下拉會出現三個選項，但背後是同一個 Pipe 檔案在分流。**改共用 helper 時只動一份**。

---

## 呼叫 OpenWebUI 內部 LLM

要在 Pipe 裡再問一次 LLM（常見於 Agent loop 決策），用官方 helper：

```python
from open_webui.models.users import Users
from open_webui.utils.chat import generate_chat_completion

async def pipe(self, body: dict, __user__: dict, __request__: Request):
    user = Users.get_user_by_id(__user__["id"])
    body["model"] = self.valves.target_model
    body["messages"] = [
        {"role": "system", "content": "你是..."},
        {"role": "user", "content": "..."},
    ]
    return await generate_chat_completion(
        __request__, body, user, bypass_filter=True
    )
```

**`bypass_filter=True` 必加**，否則會再跑一次 global filter 污染 agent 的內部呼叫。

---

## Stream vs Non-Stream 處理

```python
async def pipe(self, body: dict):
    if body.get("stream", False):
        # 回 async generator 或 iter_lines()
        return some_response.aiter_lines()
    else:
        return some_response.json()
```

OpenWebUI 會自動判斷：generator → SSE 串流；dict/str → 一次回覆。

---

## Valves / UserValves

跟其他 Plugin 相同寫法（見 [總覽](./overview#valves-與-uservalves)）。Pipe 這邊特別的是：有時使用者會對「用哪個底層模型」「溫度」「系統提示」有個人偏好，用 `UserValves` 暴露。

```python
class UserValves(BaseModel):
    system_prompt: str = Field("", description="個人的系統提示前置")
    temperature: float = Field(0.3, description="採樣溫度")
```

---

## 完整 Agent Pipe 骨架（含 tool-loop）

```python
"""
title: Simple Tool-Loop Agent
requirements: httpx
version: 0.1.0
"""

import json, re
from pydantic import BaseModel, Field
from fastapi import Request
from open_webui.models.users import Users
from open_webui.utils.chat import generate_chat_completion


class Pipe:
    class Valves(BaseModel):
        base_model: str = Field("gemma-4-26B-A4B-it-UD-Q4_K_M.gguf")
        max_steps: int = Field(6)

    def __init__(self):
        self.valves = self.Valves()

    def _exec_tool(self, tool: str, args: dict) -> str:
        # 此處執行對應工具
        return f"tool {tool} 結果：{args}"

    async def pipe(
        self, body: dict, __user__: dict, __request__: Request,
    ) -> str:
        user = Users.get_user_by_id(__user__["id"])
        user_msg = body["messages"][-1]["content"]

        sys_prompt = "You are an agent. Reply ONE JSON: {tool, args}..."
        trace = []
        for step in range(self.valves.max_steps):
            form = {
                "model": self.valves.base_model,
                "messages": [
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": f"{user_msg}\nTrace: {trace}"},
                ],
                "stream": False,
            }
            resp = await generate_chat_completion(
                __request__, form, user, bypass_filter=True
            )
            txt = resp["choices"][0]["message"]["content"]
            m = re.search(r"\{.*\}", txt, re.DOTALL)
            if not m:
                return f"解析失敗：{txt}"
            action = json.loads(m.group(0))
            if action["tool"] == "final_answer":
                return action["args"]["text"]
            trace.append({"act": action, "obs": self._exec_tool(**action)})
        return "達最大迭代次數"
```

:::warning 自己手刻 tool-loop 通常不是最佳解
上述 Pattern 是「早年的做法」。**有 [Tools](./tools) + Native Function Calling 以後，框架代你跑 loop，不用自己 parse JSON**。詳見 [常見反官方寫法](./common-pitfalls)。
:::

---

## 與 Pipelines（外部 worker）的差別

| 面向 | Pipe Function | [Pipelines](./pipelines) |
|---|---|---|
| 部署位置 | OpenWebUI 容器內 | 獨立 Docker（port 9099） |
| 擴充性 | 隨主站擴展 | 獨立 scale |
| 設定路徑 | 管理員控制台 → Functions | Settings → Connections |
| 適合 | 一般供應商、中等邏輯 | 重 CPU / GPU、大 RAG、客製 runtime |
| 套件相依 | 受主站 image 限制 | 可完全自訂 |

---

## Rich UI embed（v0.9 新 Pattern）

v0.9 起，Pipe function 可在回覆訊息中嵌入互動式 HTML 元件，搭配自訂 tool calling 做多步驟互動：

```python
async def pipe(self, body: dict, __event_emitter__=None) -> str:
    # 發送含 HTML 表單的訊息
    await __event_emitter__({
        "type": "message",
        "data": {
            "content": """
<details>
<summary>調整參數</summary>

```json
{"tool": "render_chart", "args": {"chart_type": "pareto", "column": "Defect"}}
```

</details>
""",
        },
    })
    return ""
```

這讓 Pipe 可以不走 LLM 決策、直接用 UI 互動驅動 tool call，適合確定性高的分析工作流。**詳情** 見官方 [Rich UI embed 文件](https://docs.openwebui.com/features/extensibility/plugin/development/)。

---

## outlet() 的 streaming vs API 行為（v0.9 行為釐清）

`outlet()` 在**不同呼叫路徑下行為不同**，v0.9 官方已重寫文件釐清：

| 呼叫來源 | outlet() 是否觸發 |
|---|:-:|
| 企業問答PoC Web UI（對話） | ✅ 觸發 |
| 外部 `/api/chat/completions` API | ❌ **不會觸發**（除非 client 額外打 `/api/chat/completed`） |
| Streaming response 途中 | ⚠️ outlet 只在**整個 response 完成後**才跑，不是每個 chunk |

**影響**：若 Pipe 的關鍵後處理邏輯放在 outlet，外部 API caller 會繞過它。需要百分百觸發時把邏輯移到 inlet 或做獨立 pipeline。

---

## 限制與陷阱

- **pipe() 必須 async**：v0.9 後端全面走 async，同步 `pipe()` 可能阻塞或在未來版本失效；**務必加 `async`**
- **安全**：Pipe 跑任意 Python，只能讓管理員安裝，**審 source**
- **HTTP stream 斷線**：Cloudflare Tunnel / reverse proxy 預設可能 100 s idle timeout；串流太久沒 yield 會斷。週期性 yield `" "` 或發 status 保活
- **錯誤處理**：`try/except` 包住外部呼叫，回有意義的錯誤字串
- **載入快取**：改完 Pipe 程式碼直接寫 DB 不會重載；**改完要 `docker restart open-webui`** 清 `request.app.state.FUNCTIONS` 快取
- **context 爆掉**：若自己在 Pipe 內組 history 給 LLM，**剝掉 base64 圖**（`re.sub(r'data:image/[^)]+', '[image]', ...)`）
