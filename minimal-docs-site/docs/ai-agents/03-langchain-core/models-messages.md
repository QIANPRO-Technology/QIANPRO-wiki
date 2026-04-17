---
id: models-messages
title: Chat Model 與 Messages
sidebar_label: Model 與 Messages
sidebar_position: 2
---

# Chat Model 與 Messages

## ChatModel 介面

所有 ChatModel 共用同一組 API:

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0,
    max_tokens=500,
    timeout=30,
)

resp = llm.invoke("Hi")
print(resp.content)           # 字串回應
print(resp.usage_metadata)    # token 用量
```

## 訊息類型

LangChain 把對話拆成四種訊息:

| 類型 | 用途 |
|------|------|
| `SystemMessage` | 系統指令(人格、規則) |
| `HumanMessage` | 使用者輸入 |
| `AIMessage` | 模型回應 |
| `ToolMessage` | 工具呼叫的結果回傳 |

```python
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

messages = [
    SystemMessage("你是一位耐心的 Python 助教。"),
    HumanMessage("list comprehension 怎麼用?"),
]
resp = llm.invoke(messages)
print(resp)  # AIMessage(content="...")
```

## 多輪對話

訊息列表會完整送給 LLM,手動維護最簡單:

```python
history = [SystemMessage("你是一位耐心的 Python 助教。")]

def chat(user_input: str) -> str:
    history.append(HumanMessage(user_input))
    resp = llm.invoke(history)
    history.append(resp)
    return resp.content

print(chat("list comp 怎麼用?"))
print(chat("那 dict comp 呢?"))  # 會記得前一題
```

:::tip
對話記憶進階處理(摘要、trim、外部儲存)在 [Ch 06 Memory](../06-memory/short-term.md) 有完整說明。
:::

## init_chat_model:一行切換供應商

不綁死 `ChatOpenAI`,用 `init_chat_model`:

```python
from langchain.chat_models import init_chat_model

llm = init_chat_model("gpt-4o-mini", model_provider="openai")
# 或
llm = init_chat_model("claude-3-5-haiku-latest", model_provider="anthropic")
# 或本地 vLLM
llm = init_chat_model(
    "Llama-3.3-70B-Instruct",
    model_provider="openai",
    base_url="http://dgx-spark:8000/v1",
    api_key="EMPTY",
)
```

接下來所有程式都用這種寫法,切換不改業務邏輯。

## 常用參數

| 參數 | 典型值 | 說明 |
|------|--------|------|
| `temperature` | 0 ~ 1.0 | 0 = 穩定,1.0 = 創意 |
| `max_tokens` | 500 ~ 4000 | 限制回應長度 |
| `timeout` | 30 秒 | API 超時 |
| `max_retries` | 2 | 失敗重試次數 |
| `model_kwargs` | `{"seed": 42}` | 額外 provider 參數 |

## 批次與非同步

```python
# batch
results = llm.batch([
    [HumanMessage("Q1")],
    [HumanMessage("Q2")],
    [HumanMessage("Q3")],
])

# async
import asyncio
results = asyncio.run(llm.abatch([[HumanMessage("Q")] for _ in range(10)]))
```

批次時 LangChain 會自動平行呼叫(預設 max_concurrency=5)。

## 常見錯誤

| 症狀 | 原因 / 解法 |
|------|------------|
| `AuthenticationError` | `OPENAI_API_KEY` 沒設或過期 |
| `RateLimitError` | 改用 `max_retries` 或加 `tenacity` retry |
| `ContextLengthExceededError` | 訊息太多,改用 Ch 06 的摘要/trim |
| 本地 vLLM 回純文字 | 啟動沒加 `--enable-auto-tool-choice` |

## 練習

1. 用 `init_chat_model` 同時起 `gpt-4o-mini` 和本地 vLLM,問同一題比較差異。
2. 觀察 `resp.usage_metadata` 與 `resp.response_metadata`,記錄 token 成本。
3. 寫一個簡單的 CLI chat 迴圈(hint:`while True: print(chat(input()))`)。
