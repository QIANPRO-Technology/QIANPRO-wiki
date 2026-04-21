---
id: action-functions
title: Action Functions（訊息上的互動按鈕）
sidebar_label: Action Functions
sidebar_position: 5
---

# Action Functions

**企業問答PoC 具有訊息互動按鈕特性** —— Action Function 在 **LLM 回覆的訊息下方加一顆按鈕**，使用者點了就觸發對應 Python 邏輯。可彈窗向使用者要結構化輸入、可改訊息內容、可發通知。

企業問答PoC 典型應用：
- 「匯出 PDF」「重新翻譯」「改寫成更正式語氣」這種 **後處理快捷鍵**
- 「重新以長條圖呈現」「換成 log 軸」這種 **圖表修調**（比使用者手打自然）
- 「觸發 CI/CD」「開 Jira 單」這種 **外部系統整合**
- 「加入收藏」「寄到 email」這種 **流程收尾**

---

## 完整模板

```python
"""
title: Action 顯示名稱
author: your-name
version: 1.0.0
required_open_webui_version: 0.5.0
icon_url: https://example.com/icon.svg
requirements: httpx
"""

from pydantic import BaseModel, Field


class Action:
    class Valves(BaseModel):
        priority: int = Field(default=0, description="按鈕排序（越小越左）")

    def __init__(self):
        self.valves = self.Valves()

    async def action(
        self,
        body: dict,
        __user__=None,
        __event_emitter__=None,
        __event_call__=None,
    ):
        """按鈕被點時會跑這個。"""
        # 可發 status 進度
        if __event_emitter__:
            await __event_emitter__({
                "type": "status",
                "data": {"description": "處理中…", "done": False},
            })

        # 做事
        result = "處理後的內容"

        return {"content": result}
```

---

## `action()` 簽名

```python
async def action(
    self,
    body: dict,                    # 完整對話 body（含訊息、模型、metadata）
    __user__=None,                 # 使用者資訊
    __event_emitter__=None,        # 發 status / notification
    __event_call__=None,           # 向使用者要輸入（雙向）
    __model__=None,                # 模型資訊
    __request__=None,              # FastAPI request
    __id__=None,                   # 當下訊息 id
):
    ...
```

**回傳值**：一個 dict，通常含：
- `content`：要以 assistant 身份 append 到對話的 markdown
- `files`（可選）：附加檔案清單

---

## 用 `__event_call__` 彈窗向使用者要輸入

這是 Action 比 Tool 好用的地方：**可以同步等使用者輸入**，不用在 LLM 層轉兩圈。

### 確認對話框

```python
resp = await __event_call__({
    "type": "confirmation",
    "data": {
        "title": "確定匯出？",
        "message": "這會把對話存成 PDF 並寄到使用者的 email，確定要繼續嗎？",
    },
})
# resp 是 True/False
if not resp:
    return {"content": "已取消。"}
```

### 文字輸入框

```python
email = await __event_call__({
    "type": "input",
    "data": {
        "title": "輸入 email",
        "message": "PDF 要寄到哪個信箱？",
        "placeholder": "user@example.com",
    },
})
# email 就是使用者輸入的字串
```

### 整合範例：圖表修調

```python
opts = await __event_call__({
    "type": "input",
    "data": {
        "title": "圖表參數",
        "message": "請輸入要改的選項，格式 key=value 用逗號分隔",
        "placeholder": "annotate=true,log_y=true,title=新標題",
    },
})
# 解析 opts 字串，call 內部 redraw_chart 邏輯
```

---

## 多 Action 按鈕（同一個檔）

如果想在一顆檔案裡放多個按鈕：

```python
class Action:
    actions = [
        {"id": "to_pdf",     "name": "匯出 PDF",  "icon_url": "..."},
        {"id": "to_email",   "name": "寄到信箱",   "icon_url": "..."},
        {"id": "to_notion",  "name": "存到 Notion", "icon_url": "..."},
    ]

    async def action(self, body: dict, __id__: str = None, **_):
        if __id__ == "to_pdf":
            ...
        elif __id__ == "to_email":
            ...
```

---

## UI 顯示規則

- **位置**：出現在 assistant 訊息下方工具列（重新生成、複製等按鈕旁）
- **圖示**：docstring 的 `icon_url` 或 `actions[].icon_url`，**建議用 URL**，不要 base64（會拖慢 API 回應）
- **排序**：`Valves.priority` 越小越左邊

---

## Valves

跟其他 Plugin 一樣。常見設定：
- `priority` — 按鈕位置
- 外部 API 金鑰
- 預設參數（「固定寄到這個信箱」「固定用 A4 紙大小」）

---

## 小範例：重譯按鈕

```python
"""
title: 重譯（Re-translate）
description: 把上一則 LLM 回覆翻成指定語言
version: 0.1.0
icon_url: https://example.com/translate.svg
"""

from pydantic import BaseModel, Field
from open_webui.models.users import Users
from open_webui.utils.chat import generate_chat_completion


class Action:
    class Valves(BaseModel):
        base_model: str = Field(default="gemma-4-26B-A4B-it-UD-Q4_K_M.gguf")
        priority: int = Field(default=5)

    def __init__(self):
        self.valves = self.Valves()

    async def action(
        self, body: dict, __user__=None, __event_call__=None, __request__=None,
    ):
        # 問使用者要譯到什麼語言
        lang = await __event_call__({
            "type": "input",
            "data": {
                "title": "翻譯到",
                "message": "想翻成哪個語言？",
                "placeholder": "English / 日本語 / Español ...",
            },
        })
        if not lang:
            return {"content": "已取消。"}

        last_assistant = next(
            (m for m in reversed(body["messages"]) if m["role"] == "assistant"),
            None,
        )
        if not last_assistant:
            return {"content": "找不到可翻譯的訊息。"}

        user = Users.get_user_by_id(__user__["id"])
        resp = await generate_chat_completion(
            __request__,
            {
                "model": self.valves.base_model,
                "messages": [
                    {"role": "system", "content": f"Translate the following to {lang}. Preserve markdown."},
                    {"role": "user", "content": last_assistant["content"]},
                ],
                "stream": False,
            },
            user,
            bypass_filter=True,
        )
        return {"content": resp["choices"][0]["message"]["content"]}
```

---

## 限制

- **只能在 OpenWebUI 的聊天介面看到按鈕**（外部 API 呼叫 `/chat/completions` 不會觸發）
- **Action 跑不到串流中間狀態**，只能在完成後按鈕才顯示
- `__event_call__` 彈窗會 block 直到使用者回應（或超時 300 秒）
