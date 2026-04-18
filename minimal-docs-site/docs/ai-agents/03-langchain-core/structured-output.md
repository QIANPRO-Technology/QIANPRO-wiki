---
id: structured-output
title: Structured Output
sidebar_label: Structured Output
sidebar_position: 4
---

# Structured Output(結構化輸出)

Agent 最常需要的能力:讓 LLM 回傳 **符合 schema 的物件**,而不是純文字。

## 為什麼需要?

- 工具呼叫的 arguments 必須結構化
- 下游系統需要固定欄位(不能靠 regex 解析)
- 可以做型別檢查與驗證

## 方法一:Pydantic + `with_structured_output`(推薦)

```python
from pydantic import BaseModel, Field
from langchain.chat_models import init_chat_model

class BugReport(BaseModel):
    """程式碼 bug 分析結果"""
    bug: str = Field(description="bug 的簡短描述")
    severity: str = Field(description="low / medium / high")
    fix: str = Field(description="建議修法")
    line_number: int | None = Field(None, description="出錯行號")

llm = init_chat_model("gpt-4o-mini", model_provider="openai")
structured_llm = llm.with_structured_output(BugReport)

report: BugReport = structured_llm.invoke("""
這段 Python 有什麼 bug?
def div(a, b): return a / b
div(10, 0)
""")

print(report.bug)       # "除以 0"
print(report.severity)  # "high"
print(type(report))     # <class 'BugReport'>
```

**優點**:
- 自動驗證,違反 schema 會報錯
- IDE 型別提示完整
- 等同 OpenAI 官方 function calling

## 方法二:TypedDict

不想裝 Pydantic 的話:

```python
from typing import TypedDict

class BugReport(TypedDict):
    bug: str
    severity: str
    fix: str

structured_llm = llm.with_structured_output(BugReport)
report = structured_llm.invoke("...")
print(report["bug"])
```

## 方法三:JSON Schema

最貼近底層:

```python
schema = {
    "title": "BugReport",
    "type": "object",
    "properties": {
        "bug": {"type": "string"},
        "severity": {"type": "string", "enum": ["low", "medium", "high"]},
    },
    "required": ["bug", "severity"],
}

structured_llm = llm.with_structured_output(schema)
```

## 支援性

| 供應商 | 原生支援 | 備註 |
|--------|----------|------|
| 千鉑 Gateway(gemma4-31b / qwen3-14b) | ✅ | 課程實測通過 |
| OpenAI gpt-4o / mini | ✅ | 最穩定 |
| Anthropic Claude 3.5 | ✅ | via tool use |
| Gemini 1.5+ | ✅ | |
| 其他開源模型(透過 OpenAI 相容後端) | 視模型 | 較舊模型可能需 prompt engineering |

## 課程實用範例

### 例 1:分類

```python
from pydantic import BaseModel
from typing import Literal

class Ticket(BaseModel):
    category: Literal["bug", "feature", "question", "spam"]
    priority: Literal["low", "medium", "high"]
    summary: str

classifier = llm.with_structured_output(Ticket)
ticket = classifier.invoke("登入後 3 秒閃退,每次都會發生")
# Ticket(category='bug', priority='high', summary='登入閃退')
```

### 例 2:資料萃取

LangChain `with_structured_output` 不接受 `list[X]` 作為 schema,要包一層 wrapper:

```python
from pydantic import BaseModel

class Person(BaseModel):
    name: str
    age: int | None = None
    email: str | None = None

class PeopleList(BaseModel):
    """人員清單 wrapper"""
    people: list[Person]

extractor = llm.with_structured_output(PeopleList)
result: PeopleList = extractor.invoke("""
參加者:
- 王小明 32 歲 ming@example.com
- 李小華 wahua@example.com
""")
for p in result.people:
    print(p.name, p.email)
```

:::warning 為什麼不直接用 `list[Person]`?
LangChain 的 schema 必須是 `BaseModel` / `TypedDict` / JSON Schema,**不能是 generic alias**。硬傳 `list[Person]` 會拋 `ValueError: callable ... is neither a BaseModel type nor ...`。統一用 wrapper 最保險。
:::

## 錯誤處理

LLM 偶爾會輸出違反 schema 的東西。`with_structured_output` 會丟 `ValidationError`,建議包 try:

```python
try:
    result = structured_llm.invoke(text)
except Exception as e:
    print("Schema 違反:", e)
    # fallback: 用 plain LLM 再問
```

或在 chain 尾端加重試:

```python
structured_with_retry = structured_llm.with_retry(
    stop_after_attempt=3,
)
```

## 練習

1. 定義一個 `MeetingSummary` schema(參與者、決議、待辦),從會議逐字稿抽出。
2. 比較 `gemma4-31b` 與 `qwen3-14b` 的 schema 遵循程度。
3. 故意給違反 schema 的資料,觀察錯誤訊息。
