---
id: common-pitfalls
title: 企業問答PoC 開發常見錯誤範例
sidebar_label: 常見錯誤範例
sidebar_position: 8
---

# 企業問答PoC 開發常見錯誤範例

## 背景

**企業問答PoC**（站點：[webai.qianpro.shop](https://webai.qianpro.shop)）底層框架是 [OpenWebUI](https://docs.openwebui.com/)。當我們要在上面做客製 Agent、Tool、Filter 時，很容易**沒讀官方擴充文件就自己土法逆推寫法**，寫出來看起來能動、實際上繞過了框架內建的機制，結果：

- 程式碼比該有的肥 2~3 倍
- 效能差（KV cache 失效、每輪 re-prompt）
- 維護成本高（schema 跟實作脫鉤、bug fix 要改多處）
- 行為不穩（自己 parse LLM 回覆遇到邊界案例就壞）

這一篇用公司**實際案例「製程數據洞察 Agent」(`process_insight` v0.2 Pipe)** 當教材，列出我們在第一版就踩到的五個典型錯誤、分析成因，並對照 OpenWebUI 官方正統寫法。

:::info 讀者對象
這不是給「第一次寫 OpenWebUI 擴充」的人看的入門教材，而是給**已經寫過一版、準備第二版重構**的人看的反省清單。配合 [Tools](./tools) / [Pipe Functions](./pipe-functions) / [Filter Functions](./filter-functions) / [Action Functions](./action-functions) 四篇規格頁看效果最好。
:::

**TL;DR**：很多「我在 Pipe 裡自己寫 agent loop、手刻 JSON schema、refine 靠使用者打字」的做法，其實都有**官方內建機制幫你做**，不必重造輪子。

---

## Pitfall 1 — 在 Pipe 裡手刻 JSON tool-loop

### 反 Pattern

```python
# ❌ 在 Pipe 裡自己 loop、自己 regex parse LLM 回覆、自己執行工具
class Pipe:
    async def pipe(self, body, __request__, __user__):
        for step in range(max_steps):
            raw = await generate_chat_completion(
                __request__,
                {"model": base_model, "messages": [...], "stream": False},
                user, bypass_filter=True,
            )
            text = raw["choices"][0]["message"]["content"]
            m = re.search(r"\{.*\}", text, re.DOTALL)
            action = json.loads(m.group(0))  # 解析失敗就爆
            if action["tool"] == "final_answer":
                return action["args"]["text"]
            result = self._exec_tool(action["tool"], action["args"])
            trace.append({"act": action, "obs": result})
```

### 問題

- **兩層 parse 風險**：LLM 可能把 JSON 包進 ```json fence、前後加說明、漏逗號……你要寫 3 種 fallback regex
- **沒走官方 Function Calling**：KV cache 失效、每輪重送完整 system prompt，速度慢
- **loop state 自己管**：trace 累積、context 爆掉、base64 圖要手動剝

### 官方正統

用 [Tools](./tools) + **Native Function Calling**：

```python
# ✅ 寫 Tools 就好，框架代跑 loop
class Tools:
    async def render_chart(
        self,
        chart_type: str,           # "pareto|histogram|spatial|correlation"
        column: str,
        annotate: bool = False,
        log_y: bool = False,
    ) -> str:
        """根據指定參數產出圖表 markdown。..."""
        # 純執行邏輯
        return png_markdown

    async def query_data(self, expr: str) -> str:
        """對當前 DataFrame 執行 pandas 表達式。..."""
        ...
```

然後：

1. 把這個 Tool 綁到模型（Workspace → Models → 編輯 → 勾上此 Tool）
2. 開 Native Function Calling
3. Gemma / Qwen 會自動決定 call 哪個 Tool、帶什麼參數，框架自己處理 loop

**好處**：程式量大幅減少、parse 交給框架、KV cache 保留。

---

## Pitfall 2 — 手寫 tools_spec 字串

### 反 Pattern

```python
# ❌ 用字串 concat 組 tool schema 塞進 system prompt
def _tools_spec(self) -> str:
    return (
        "TOOLS:\n"
        '1. redraw_chart → {"tool":"redraw_chart","args":{'
        '"chart_type":"pareto|histogram|...",'
        '"column":"<col_name>",'
        '"opts":{"annotate":bool, ...}}}\n'
        ...
    )
```

### 問題

- **Schema 跟實作容易脫鉤**：加了新參數沒更新 spec 字串，LLM 傳舊參數、或傳錯參數
- **LLM 不知道 enum 範圍**：`chart_type: "pareto|histogram|..."` 只是字串，沒 JSON Schema enum
- **預設值資訊遺失**
- **修 spec 要改兩處**（類別方法 + spec 字串）

### 官方正統

**type hints + docstring → 框架自動生成 JSON schema**：

```python
# ✅ 加 type hint 就有 schema
from typing import Literal

class Tools:
    async def render_chart(
        self,
        chart_type: Literal["pareto", "histogram", "spatial", "correlation"],
        column: str,
        annotate: bool = False,
        top_n: int = 12,
        log_y: bool = False,
    ) -> str:
        """
        根據指定參數產出圖表 markdown。

        :param chart_type: 圖表類型
        :param column: 要繪製的欄位名
        :param annotate: 是否在 bar 上標數值
        :param top_n: Pareto 顯示前 N 類
        """
        ...
```

框架會自動產出：

```json
{
  "name": "render_chart",
  "description": "根據指定參數產出圖表 markdown。",
  "parameters": {
    "type": "object",
    "properties": {
      "chart_type": {"type": "string", "enum": ["pareto", "histogram", "spatial", "correlation"], "description": "圖表類型"},
      "column":     {"type": "string", "description": "要繪製的欄位名"},
      "annotate":   {"type": "boolean", "default": false, "description": "是否在 bar 上標數值"},
      "top_n":      {"type": "integer", "default": 12, "description": "Pareto 顯示前 N 類"},
      "log_y":      {"type": "boolean", "default": false}
    },
    "required": ["chart_type", "column"]
  }
}
```

---

## Pitfall 3 — 沒用 Manifold，複製貼上多份相似 Pipe

### 反 Pattern

同一套分析邏輯想給不同產線用，結果寫 3 個幾乎一樣的 `.py`：

```
process_insight_aoi.py       # AOI 瑕疵分析
process_insight_sales.py     # 銷售報表分析
process_insight_iot.py       # IoT 感測器分析
```

### 問題

- 改共用 helper 要改 3 次
- bug fix 容易漏一家
- 下拉清單一堆幾乎同名項目

### 官方正統

**[Pipe Manifold](./pipe-functions#manifold一支-pipe-暴露多個模型)**：

```python
# ✅ 一支 Pipe 分流
class Pipe:
    def pipes(self):
        return [
            {"id": "aoi",   "name": "AOI 瑕疵分析師"},
            {"id": "sales", "name": "銷售報表分析師"},
            {"id": "iot",   "name": "IoT 感測器分析師"},
        ]

    async def pipe(self, body: dict):
        variant = body["model"].split(".")[-1]
        if variant == "aoi":
            return await self._analyze_aoi(body)
        elif variant == "sales":
            return await self._analyze_sales(body)
        elif variant == "iot":
            return await self._analyze_iot(body)
```

- 下拉一次看到三個選項
- 背後同一個檔案、共用 helper
- 改一次套用三家

---

## Pitfall 4 — Refine 靠使用者打字

### 反 Pattern

使用者看到圖想改：「把 Pareto 的 bar 加上數字」「把 size 改成 log 軸」「按 Defect Class 分色」，每次都要打中文、讓 LLM 猜意圖轉成 JSON action。

### 問題

- LLM 可能把「加數字」解成 `title: "加數字"` 這種搞錯意思
- 每次要讓 LLM 再想一輪 → 慢、花 token
- 參數組合爆炸：`annotate`、`top_n`、`color_col`、`log_y`、`palette` 五六個，自然語言描述容易漏

### 官方正統

**[Action Functions](./action-functions)**：

在每張圖下方加按鈕「調整參數」，點了彈 `__event_call__({"type": "input"})` 讓使用者填結構化欄位：

```python
# ✅ 按鈕 + 彈窗問結構化參數
class Action:
    async def action(self, body, __event_call__=None, **_):
        opts_str = await __event_call__({
            "type": "input",
            "data": {
                "title": "調整圖表參數",
                "message": "格式：key=value，逗號分隔",
                "placeholder": "annotate=true,log_y=true,top_n=5",
            },
        })
        opts = _parse_opts(opts_str)
        # 直接 call render_chart 重畫，不經 LLM
        return {"content": _redraw(opts)}
```

- 使用者不用思考怎麼表達意圖
- 不經 LLM → 秒回
- 參數名稱清楚可填

**更進一步**：多 action（`actions = [...]`）放三顆預設按鈕：「加數字」「log 軸」「按分類分色」，點了直接改，連彈窗都省。

---

## Pitfall 5 — 預設行為寫死，使用者想關關不掉

### 反 Pattern

Pipe 首輪強制跑 profile + 4 張圖：

```python
# ❌ 使用者沒選擇
async def pipe(self, body):
    if is_first_turn:
        yield profile_markdown
        yield pareto_chart
        yield hist_chart_1
        yield hist_chart_2
        yield hist_chart_3
        yield spatial_chart
        yield corr_chart
```

### 問題

- 資料量大時首輪等很久
- 使用者只想問某個特定問題，不想要完整報告
- 想換 4 張圖組合要改 Python

### 官方正統

**[Filter Function + toggle](./filter-functions#toggle使用者層級開關)**：

把「自動產預設圖」拆成獨立 Filter，`toggle=True`：

```python
# ✅ 可開關
class Filter:
    def __init__(self):
        self.toggle = True  # 聊天 ⚙️ 出現開關

    async def outlet(self, body, **_):
        # 如果使用者在這次對話開了這個 filter，才塞預設圖
        ...
        return body
```

- 使用者在 chat UI ⚙️ 可勾可不勾
- 模型層面可設「預設開 / 預設關」
- 不同使用者各自選偏好

另一個替代：**UserValves** 暴露 `auto_default_charts: bool`，讓使用者在個人設定打開關。

---

## 我們實際改進路線（process_insight v0.3 草圖）

把 v0.2 的 Pipe **拆開**：

```
openwebui-functions/
├── process_insight_tools.py      ← 新：class Tools，三個 public method
│   ├── analyze_csv()             ← 首輪分析 entry point
│   ├── render_chart()            ← 產任意圖
│   └── query_data()              ← 跑 pandas 表達式
│
├── process_insight_actions.py    ← 新：圖表下的按鈕
│   └── 三顆：加數字 / log 軸 / 按分類分色
│
└── process_insight_auto_chart_filter.py   ← 新（可選）
    └── toggle=True，自動產預設圖 on/off
```

然後：

- **沒有 Pipe 檔**
- 在 Workspace → Models 建 wrapper，base = Gemma 26B，系統提示寫 agent 指示，勾上三個 Tools
- Native Function Calling 開

**結果**：
- 程式碼從 ~570 行降到 ~200 行
- 使用者可以在 UI 把這三個 Tools 組到任何 wrapper 上 → 真正做到**管理員 UI 組 agent**
- Tools 跨模型重用（Qwen、GPT-OSS 切過來都吃得到）
- 有按鈕可以點（不用打字）
- 自動圖可以關

---

## 其他值得注意的小陷阱

| 陷阱 | 影響 | 修法 |
|---|---|---|
| 用 `message` event 串流 markdown | Native mode 會被覆蓋 | 改用 `status` 事件 + 最後一次回整段 |
| 自己 parse `__user__` 的 token | 不安全、token 會過期 | 用 `__user__['oauth_token']`（自動 refresh） |
| docstring 指定 `requirements:` 正式環境也裝 | 多 worker race condition、版本衝突 | 相依 bake 到 image，關 `ENABLE_PIP_install_FRONTMATTER_REQUIREMENTS` |
| 圖示塞 base64 | API payload 肥大 | 用 hosted URL |
| Filter 回 `None` | 鏈斷 | 每個方法都 `return body` |
| SQL UPDATE `function` table 後沒重啟 | 快取沒清 | `docker restart open-webui` |

---

## 小結決策表

| 你想做… | 選這個 |
|---|---|
| 讓 LLM 呼叫某個後端函式 | [Tool](./tools) |
| 做一個可選的「模型」／Agent | [Pipe](./pipe-functions)（如果行為簡單，考慮用 Tool + Model Wrapper 取代） |
| 一組相似 Agent 多變體 | Pipe + `pipes()`（Manifold） |
| 所有對話都要做的前處理 | [Filter global](./filter-functions) |
| 使用者可選的功能 | [Filter toggle](./filter-functions#toggle使用者層級開關) |
| 訊息下的互動按鈕 | [Action](./action-functions) |
| 接現有的 MCP 伺服器 | [MCP Streamable HTTP](./mcp) |
| 重運算 / 獨立 scale | [Pipelines](./pipelines) |
