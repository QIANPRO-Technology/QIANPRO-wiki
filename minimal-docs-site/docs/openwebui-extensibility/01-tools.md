---
id: tools
title: Tools（LLM 可呼叫的方法）
sidebar_label: Tools
sidebar_position: 2
---

# Workspace Tools 開發

**企業問答PoC 具有 Workspace Tools 整合特性** —— 管理員可以上傳一支 Python `.py`，裡面定義的每個 public async method 都會變成 LLM 在對話中能 function-call 的工具。框架會從 **type hints + docstring** 自動生成 JSON schema，不用手寫 tool spec。

這是[六類 Tools](./tools-taxonomy) 中唯一**在企業問答PoC 容器內執行**的 Python 腳本類型，能存取內部資料、呼叫內部 LLM、存取上傳檔案。

---

## 完整模板

```python
"""
title: Tool 顯示名稱
author: your-name
author_url: https://...
git_url: https://github.com/...
description: 這個 Tool 做什麼
required_open_webui_version: 0.4.0
requirements: httpx>=0.27,pandas
version: 0.1.0
licence: MIT
"""

from pydantic import BaseModel, Field
import asyncio


class Tools:
    class Valves(BaseModel):
        """管理員層級設定（所有使用者共用）。"""
        api_key: str = Field("", description="外部 API key")
        timeout: int = Field(30, description="請求 timeout 秒數")

    class UserValves(BaseModel):
        """使用者層級設定（每個人自己的偏好）。"""
        language: str = Field("zh-TW", description="回覆語言")

    def __init__(self):
        self.valves = self.Valves()
        self.citation = False  # 想自己發 citation 事件時設 False 避免被覆蓋

    async def search_web(
        self,
        query: str,
        max_results: int = 5,
        __user__: dict = None,
        __event_emitter__=None,
    ) -> str:
        """
        搜尋網頁並回傳摘要。

        :param query: 要搜尋的關鍵字
        :param max_results: 最多回傳幾筆結果
        """
        if __event_emitter__:
            await __event_emitter__({
                "type": "status",
                "data": {"description": f"搜尋「{query}」…", "done": False},
            })

        # 實際邏輯
        results = f"（{max_results} 筆關於 {query} 的結果）"

        if __event_emitter__:
            await __event_emitter__({
                "type": "status",
                "data": {"description": "完成", "done": True},
            })
        return results
```

---

## 關鍵規則

### 類別與方法

- 類別名**必須是 `Tools`**（大小寫要正確，複數 s）
- 所有 **public async method** 自動暴露為 tool（不需要 decorator）
- 方法名 = tool 名
- Docstring 第一行 = tool 描述（給 LLM 看）
- 同步方法也能跑，但官方建議用 `async`

### Type Hints 決定 schema

沒 type hint 時 LLM 會很難把參數填對，**請務必標註**：

```python
async def query(
    self,
    table: str,                    # ✅ 基本型別
    limit: int = 10,               # ✅ 帶預設值
    cols: list[str] = None,        # ✅ 複合型別
    filter: dict[str, str] = None, # ✅ 巢狀 dict
) -> str:
    """..."""
```

巢狀型別（`list[tuple[str, int]]`、`dict[str, list[int]]` 等）也 OK。

### 回傳值

- 預設回 `str` → 會被當 assistant 訊息 append 到對話
- 想串流中間訊息：**用 `__event_emitter__` 發 `status` 事件**，不要 yield markdown
  （Native mode 下 `message` 事件會被覆蓋）
- 發 citation 前先設 `self.citation = False`，否則框架會自動加 citation 覆蓋掉自訂的內容

---

## 事件類型支援表

| 事件類型 | Native 模式 | Default 模式 | 用途 |
|---|:-:|:-:|---|
| `status` | ✅ | ✅ | 中間進度，`done: False/True` |
| `message` | ⚠️ 會被覆蓋 | ✅ | 漸進式 append 內容 |
| `replace` | ⚠️ 會被覆蓋 | ✅ | 取代整段回覆 |
| `citation` | ✅ | ✅ | 來源引用（需 `self.citation = False`） |
| `notification` | ✅ | ✅ | Toast 通知 |
| `files` | ✅ | ✅ | 附加檔案 |
| `chat:title` | ✅ | ✅ | 改對話標題 |
| `chat:tags` | ✅ | ✅ | 改對話標籤 |
| `chat:message:error` | ✅ | ✅ | 顯示錯誤 |
| `confirmation` | ✅ | ✅ | 請使用者確認 |
| `input` | ✅ | ✅ | 請使用者輸入 |

**多步驟流程請用 `status`**。想漸進顯示內容時只能用 Default mode。

---

## 如何被使用

1. **管理員控制台 → Tools**（或 Workspace → Tools）上傳這個 `.py`
2. **工作區 → Models → 編輯某模型** → 勾選要綁的 Tools
3. 對話時該模型就能自動決定何時呼叫 Tool

使用者也能在聊天介面 **`+` → Tools** 自行啟用需要的 Tool（chat-scoped）。

---

## 存取 Valves / UserValves / OAuth Token

```python
async def call_api(self, endpoint: str, __user__: dict = None) -> str:
    # 管理員設定
    api_key = self.valves.api_key

    # 使用者個人偏好
    user_valves = __user__.get("valves") if __user__ else None
    lang = user_valves.language if user_valves else "zh-TW"

    # 使用者的 OAuth token（若該使用者走 SSO）
    # 會自動 refresh，用它呼叫需授權的後端
    oauth = __user__.get("oauth_token")
    ...
```

---

## 呼叫外部服務

沒限制任何 HTTP client。推薦 `httpx`（async 原生）：

```python
import httpx

async def fetch_price(self, ticker: str) -> str:
    async with httpx.AsyncClient(timeout=self.valves.timeout) as client:
        r = await client.get(f"https://api.example.com/quote/{ticker}")
        r.raise_for_status()
        return r.json().get("price", "N/A")
```

---

## 限制與陷阱

- **安全**：Workspace Tools 跑任意 Python，只能讓管理員安裝，**審核 source 再上**
- **套件衝突**：多個 Tool docstring 指定不同版本的同一套件會非確定性爆炸。正式環境關掉 `ENABLE_PIP_install_FRONTMATTER_REQUIREMENTS`，把相依 bake 到 image
- **Citation 行為**：想自己發 citation **一定要** `self.citation = False`，否則會被框架自動 citation 覆蓋
- **Native mode 限制**：`message` / `replace` 事件不會顯示。串流進度只能用 `status`
- **OAuth tokens**：用 `__user__['oauth_token']` 是**新建議做法**。別再從 header 自己 parse

---

## 小範例：把既有 API 包成 Tool

```python
"""
title: Weather
description: 查一個城市的即時天氣
requirements: httpx
version: 0.1.0
"""

from pydantic import BaseModel, Field
import httpx


class Tools:
    class Valves(BaseModel):
        api_base: str = Field("https://wttr.in", description="天氣 API base URL")

    def __init__(self):
        self.valves = self.Valves()

    async def get_weather(self, city: str) -> str:
        """查詢指定城市的即時天氣摘要。

        :param city: 城市名稱，例：Taipei、Tokyo
        """
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{self.valves.api_base}/{city}?format=3")
            return r.text.strip()
```

把這個 Tool 綁上任何模型，使用者問「台北現在天氣？」，LLM 會自動 call `get_weather(city="Taipei")`。
