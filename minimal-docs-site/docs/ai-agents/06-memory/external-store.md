---
id: external-store
title: 外部訊息儲存
sidebar_label: 外部儲存
sidebar_position: 3
---

# 外部訊息儲存

Checkpointer 存的是 **整張 graph 的 state**,除了訊息還有其他欄位。有時你只想存訊息、或要跟現有系統整合。

## 與 Checkpointer 的差別

| | Checkpointer | External Store |
|---|---|---|
| 存什麼 | 整張 graph state(所有欄位) | 只存訊息/資料 |
| 用途 | 恢復執行 | 跟現有 DB 整合 |
| 實作 | LangGraph 內建 | 自己寫 |

## 範例:訊息存 sqlite

```python
import sqlite3
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.graph import MessagesState, StateGraph, START, END

conn = sqlite3.connect("chat.db", check_same_thread=False)
conn.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id TEXT,
        role TEXT,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")

def load_history(thread_id: str) -> list:
    rows = conn.execute(
        "SELECT role, content FROM messages WHERE thread_id=? ORDER BY id",
        (thread_id,),
    ).fetchall()
    msgs = []
    for role, content in rows:
        msgs.append(HumanMessage(content) if role == "human" else AIMessage(content))
    return msgs

def save_message(thread_id: str, role: str, content: str):
    conn.execute(
        "INSERT INTO messages(thread_id, role, content) VALUES (?,?,?)",
        (thread_id, role, content),
    )
    conn.commit()
```

在 graph 中使用時,把 thread_id 從 RunnableConfig 傳進來:

```python
def call_llm(state: MessagesState, config) -> dict:
    thread_id = config["configurable"]["thread_id"]
    history = load_history(thread_id)
    resp = llm.invoke(history + state["messages"])
    # 寫回 sqlite
    for m in state["messages"]:
        save_message(thread_id, m.type, m.content)
    save_message(thread_id, "ai", resp.content)
    return {"messages": [resp]}
```

## 適合場景

- 已有現成聊天紀錄表
- 跨 Agent 共享歷史(同一 thread_id 給多個 Agent)
- Compliance 要求(歷史必須進企業 DB)

## 缺點

- 手動實作比 Checkpointer 麻煩
- 失去 LangGraph 的 time-travel / HITL 功能(那些靠 Checkpointer)

一般建議 **兩者並存**:Checkpointer 負責 graph 恢復,External Store 負責合規/查詢。
