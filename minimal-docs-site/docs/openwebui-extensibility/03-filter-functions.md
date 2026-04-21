---
id: filter-functions
title: Filter Functions（middleware）
sidebar_label: Filter Functions
sidebar_position: 4
---

# Filter Functions

**企業問答PoC 具有 middleware 攔截特性** —— Filter Function 跑在所有對話（或被勾選的模型）上，在三個階段切入：送 LLM 前（`inlet`）、串流中（`stream`）、回應完（`outlet`）。你能在這幾個時機改 body、改 token、加 audit log、蓋系統提示。

企業問答PoC 實務上用這個做：
- 翻譯（使用者打中文 → 轉英文餵 LLM → 回來再譯中）
- 內容審查 / PII 遮蔽（公司資料合規）
- 合規紀錄（把所有對話寫 audit log，便於稽核）
- 注入動態系統提示（例：「列出所有可查文件」、當下知識庫狀態）

公司內部實例：`iso_kb_injector` filter（ISO 知識庫文件清單動態注入）就是走這條路。

---

## 完整模板

```python
"""
title: Filter 名稱
author: your-name
description: 做什麼用
required_open_webui_version: 0.5.0
version: 0.1.0
"""

from pydantic import BaseModel, Field
from typing import Optional


class Filter:
    class Valves(BaseModel):
        priority: int = Field(
            default=0,
            description="執行順序，數字越小越早跑",
        )
        # 你自己的設定

    def __init__(self):
        self.valves = self.Valves()
        self.toggle = False   # True 時會在聊天 UI ⚙️ 出現開關
        self.icon = "https://example.com/icon.svg"  # toggle 顯示的圖示

    async def inlet(
        self,
        body: dict,
        __event_emitter__=None,
        __user__: Optional[dict] = None,
        __metadata__: Optional[dict] = None,
        __model__: Optional[dict] = None,
        __request__=None,
    ) -> dict:
        """送 LLM 前攔截。可改 body['messages'] 或塞新欄位。"""
        return body

    def stream(self, event: dict) -> dict:
        """每個 streaming chunk 都會進來。可改 event['choices'][0]['delta']['content']。"""
        return event

    async def outlet(
        self,
        body: dict,
        __event_emitter__=None,
        __user__: Optional[dict] = None,
        __metadata__: Optional[dict] = None,
    ) -> dict:
        """LLM 回完整段後。可改整個 body['messages']。"""
        return body
```

---

## 三階段觸發時機

| 方法 | 觸發 | WebUI 對話 | Direct `/chat/completions` API |
|---|---|:-:|:-:|
| `inlet` | 送 LLM 前 | ✅ 每次 | ✅ 每次 |
| `stream` | 每個 token chunk 回來時 | ✅ 每 chunk | ✅ 每 chunk |
| `outlet` | 完整回覆後 | ✅ 每次 | ❌ **不會跑**（除非 client 另外打 `/api/chat/completed`） |

**重要**：若 filter 主要工作在 `outlet`（例：log 完整對話），外部 API caller 會繞過它。需要百分百觸發時把邏輯搬到 `inlet` 或另做 log pipeline。

---

## 資料流

```
User input
    │
    ▼
Filter A inlet (priority=0)      ──┐
    │                              │  每個 filter 會收到前一個修改後的 body
Filter B inlet (priority=1)      ──┤
    │                              │  任一 filter 回 None 或拋錯 → 鏈斷
    ▼                              │
LLM call                         ──┘
    │
    ▼
stream 階段：每 chunk 走 Filter A.stream → Filter B.stream → 給 UI
    │
    ▼
Filter B outlet → Filter A outlet → 最終結果
```

---

## Priority（排序）

Valves 裡的 `priority` 欄位控制執行順序：

- **數字小 → 早跑**
- 預設 `0`
- 同 priority 時按 function ID 字母序
- **每個 filter 必須 `return body`**，否則鏈斷、後面全不跑

---

## is_global vs 每模型指定

Filter 有兩個獨立的開關：**`is_active`（啟用）** 與 **`is_global`（全站）**：

| `is_active` | `is_global` | 實際行為 |
|:-:|:-:|---|
| ✅ | ✅ | **所有模型強制套用**，使用者無法關 |
| ❌ | ✅ | 完全停用 |
| ✅ | ❌ | 只對「模型設定裡有勾此 filter」的模型生效 |
| ❌ | ❌ | 完全停用 |

**切 global**：管理員控制台 → Functions → 該 filter → `⋮` → 🌐 圖示。

---

## Toggle（使用者層級開關）

想讓使用者**自己在聊天介面決定**要不要跑這個 filter？

```python
def __init__(self):
    self.toggle = True
    self.icon = "https://example.com/foo.svg"  # 圖示建議用 URL，別塞 base64
```

開啟 `toggle=True` 後：

1. **模型編輯畫面** → 「預設 Filter」區塊可設定此 filter 的預設開關狀態
2. **聊天介面 ⚙️**（整合選單）→ 使用者可以 per-chat 開關

適合「可選擇的功能」：網頁搜尋、翻譯、啟用引用標註等。**合規類（PII 遮蔽、內容審查）不要開 toggle**，使用者可能會關掉。

---

## 常見陷阱

- **鏈斷**：`inlet` / `outlet` 回 `None` 後面全部不跑。一定要 `return body`
- **outlet 不會在 API call 跑**：若 filter 關鍵工作在 outlet，外部程式 bypass 掉就失效
- **priority 碰撞**：多個 filter 給同一個 priority 時排序變成字母序。行為相依時請**顯式分開 priority**
- **圖示大小**：用 URL，不要 base64（會讓 response payload 爆炸）
- **event 發了但使用者沒看到**：filter 跑在 API 請求（非 WebUI）時也會 emit，但 UI 不存在 → 不會顯示。這是正常行為

---

## 小範例：注入動態知識庫清單

```python
"""
title: ISO 知識庫清單注入器
description: inlet 階段把所有 ISO 文件清單塞進 system prompt
version: 0.1.0
"""

from pydantic import BaseModel, Field
from typing import Optional


class Filter:
    class Valves(BaseModel):
        priority: int = Field(default=5)
        kb_name: str = Field(default="ISO")

    def __init__(self):
        self.valves = self.Valves()

    async def inlet(self, body: dict, __user__: Optional[dict] = None) -> dict:
        # 假設 _get_kb_filenames 從你家 DB 拉清單
        files = _get_kb_filenames(self.valves.kb_name)
        injection = f"【知識庫 {self.valves.kb_name}】共 {len(files)} 份：\n" + \
                    "\n".join(f"- {f}" for f in files)
        msgs = body.get("messages", [])
        if msgs and msgs[0].get("role") == "system":
            msgs[0]["content"] = injection + "\n\n" + msgs[0]["content"]
        else:
            msgs.insert(0, {"role": "system", "content": injection})
        body["messages"] = msgs
        return body

    async def outlet(self, body: dict, **_) -> dict:
        return body


def _get_kb_filenames(name: str) -> list[str]:
    return ["CE-01 文件資料管理辦法.pdf", "CE-02 品質記錄管理辦法.pdf"]
```
