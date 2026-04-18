---
id: summarization
title: 摘要 / Trim / 過濾
sidebar_label: 摘要 & Trim
sidebar_position: 2
---

# 摘要 / Trim / 過濾訊息

對話變長時,三種處理方式:

| 策略 | 做什麼 | 犧牲 |
|------|--------|------|
| **Trim** | 保留最近 N 條 | 遺忘舊資訊 |
| **Filter** | 按條件挑選 | 需設計條件 |
| **Summarize** | 把舊訊息壓成摘要 | 多一次 LLM call |

## Trim:保留最近 N 條

```python
from langchain_core.messages import trim_messages

def call_llm(state: MessagesState) -> dict:
    trimmed = trim_messages(
        state["messages"],
        max_tokens=4000,
        strategy="last",      # 從後往前留
        token_counter=llm,    # 用 LLM 的 tokenizer 算
        include_system=True,  # 系統訊息一定保留
    )
    return {"messages": [llm.invoke(trimmed)]}
```

特色:
- 總是保留 system message
- 確保第一條是 human(LLM 對起始訊息型別挑剔)

## Filter:挑選特定訊息

```python
def call_llm(state: MessagesState) -> dict:
    # 只留最後 6 條
    msgs = state["messages"][-6:]
    return {"messages": [llm.invoke(msgs)]}
```

但 `state["messages"]` **本身不會被修改**。如果希望 state 裡的訊息被刪掉,要用 `RemoveMessage`:

```python
from langchain_core.messages import RemoveMessage

def trim_node(state: MessagesState) -> dict:
    if len(state["messages"]) > 10:
        to_remove = state["messages"][:-6]
        return {"messages": [RemoveMessage(id=m.id) for m in to_remove]}
    return {}
```

## Summarize:把歷史壓成摘要

```python
from langchain_core.messages import SystemMessage, RemoveMessage

class SummaryState(MessagesState):
    summary: str

def summarize_node(state: SummaryState) -> dict:
    if len(state["messages"]) < 10:
        return {}
    # 組 prompt 讓 LLM 摘要前面 8 條
    old = state["messages"][:-2]
    prompt = f"舊摘要:{state.get('summary', '(無)')}\n\n新對話:\n"
    prompt += "\n".join(f"{m.type}: {m.content}" for m in old)
    prompt += "\n\n請用一段話濃縮成新摘要。"
    new_summary = llm.invoke(prompt).content

    # 刪掉舊訊息
    return {
        "summary": new_summary,
        "messages": [RemoveMessage(id=m.id) for m in old],
    }

def call_llm(state: SummaryState) -> dict:
    msgs = state["messages"]
    if state.get("summary"):
        msgs = [SystemMessage(f"先前摘要:{state['summary']}")] + msgs
    return {"messages": [llm.invoke(msgs)]}
```

組 graph:

```python
from langgraph.graph import StateGraph, START, END

builder = StateGraph(SummaryState)
builder.add_node("summarize", summarize_node)
builder.add_node("llm", call_llm)
builder.add_edge(START, "summarize")
builder.add_edge("summarize", "llm")
builder.add_edge("llm", END)
graph = builder.compile(checkpointer=MemorySaver())
```

效果:對話超過 10 條時,前 8 條被壓成 `summary`,state 輕巧。

## 何時用哪個?

| 情境 | 選擇 |
|------|------|
| 短對話、任務型(問答、工具呼叫) | Trim 或不處理 |
| 長對話、角色扮演(要記個性) | Summarize |
| 有敏感資訊要定期刪 | Filter + RemoveMessage |
| 多 session、跨天記憶 | 進階看 [長期記憶](./long-term-memory) |

## 實務建議

- **把摘要放 system message** — LLM 更容易拿來用
- **保留最近 2-4 條原文** — 摘要無法完整保留語氣、細節
- **監控 token** — 用 callback / log 記錄實際 context 長度,設門檻告警

## 練習

1. 在 [Ch 05 ReAct Agent](../05-langgraph-intro/react-agent.md) 加上 Trim,對話超過 8 條時只保留最近 4 條。
2. 比較「trim」和「summarize」對答案品質的影響。
