---
id: streaming
title: Streaming 串流輸出
sidebar_label: Streaming
sidebar_position: 5
---

# Streaming 串流輸出

讓使用者看到 LLM 「正在打字」而不是等整段出完,是現代 AI 應用的基本 UX。

## 最簡單:`.stream()`

```python
from langchain.chat_models import init_chat_model
llm = init_chat_model(
    "gemma4-31b",
    model_provider="openai",
    base_url="http://192.168.1.101:4000/v1",
    api_key="sk-你的-token",
    max_tokens=1024,
)

for chunk in llm.stream("寫一首關於 AI 的短詩"):
    print(chunk.content, end="", flush=True)
```

`chunk` 是 `AIMessageChunk`,`content` 是增量文字。

## 非同步版本

```python
import asyncio

async def main():
    async for chunk in llm.astream("寫一首詩"):
        print(chunk.content, end="", flush=True)

asyncio.run(main())
```

FastAPI / Streamlit / Gradio 這類 web 框架都有非同步 API。

## chain 也能串流

```python
chain = prompt | llm
for chunk in chain.stream({"topic": "LangChain"}):
    print(chunk.content, end="", flush=True)
```

## `astream_events`:看到每一步

Agent 執行時,`astream_events` 能拿到 Chain 內每個節點的事件:

```python
async for event in chain.astream_events({"topic": "AI"}, version="v2"):
    kind = event["event"]
    if kind == "on_chat_model_stream":
        chunk = event["data"]["chunk"]
        print(chunk.content, end="", flush=True)
    elif kind == "on_tool_start":
        print(f"\n[Tool start: {event['name']}]")
    elif kind == "on_tool_end":
        print(f"\n[Tool end: {event['data']['output']}]")
```

事件類型包括:
- `on_chat_model_start / stream / end`
- `on_tool_start / end`
- `on_chain_start / end`

這是 Agent UI 最常用的 API。

## LangGraph 的串流模式

在 Ch 05 會看到 LangGraph 有四種 stream 模式:

| 模式 | 內容 |
|------|------|
| `values` | 每步完整 state |
| `updates` | 每步變更 |
| `messages` | 僅 chat 訊息 token |
| `custom` | 自訂事件 |

```python
# 預告
for chunk in graph.stream(input, stream_mode="messages"):
    print(chunk, end="")
```

## UI 實作模板

### Streamlit

```python
import streamlit as st
from langchain.chat_models import init_chat_model

llm = init_chat_model(
    "gemma4-31b",
    model_provider="openai",
    base_url="http://192.168.1.101:4000/v1",
    api_key="sk-你的-token",
    max_tokens=1024,
)

if prompt := st.chat_input("問我任何事"):
    with st.chat_message("assistant"):
        # st.write_stream 能直接吃 generator
        st.write_stream(chunk.content for chunk in llm.stream(prompt))
```

### FastAPI + SSE

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.post("/chat")
async def chat(q: str):
    async def gen():
        async for chunk in llm.astream(q):
            yield f"data: {chunk.content}\n\n"
    return StreamingResponse(gen(), media_type="text/event-stream")
```

## 常見錯誤

| 症狀 | 原因 |
|------|------|
| 看不到串流、整段才出 | forgot `flush=True` 或反向代理有 buffer |
| `async for` 報錯 | 同步 context 請用 `.stream()`,非同步才 `.astream()` |
| token 拆成亂碼 | chunk 不是 utf-8 邊界,累積後再解碼 |

## 練習

1. 用 Streamlit 做一個 chat UI,連到課程 Gateway(`gemma4-31b`)。
2. 在 chain 中加一個 tool 呼叫,觀察 `astream_events` 事件順序。
