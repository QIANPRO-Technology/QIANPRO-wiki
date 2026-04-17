---
id: interrupts
title: interrupt() 與 Command
sidebar_label: interrupt()
sidebar_position: 2
---

# interrupt() 與 Command

LangGraph 0.2+ 推出 **函式式 HITL** — 在 node 中直接 `interrupt()`,更乾淨。

## interrupt():在 node 內等人

```python
from langgraph.types import interrupt, Command

def approval_node(state):
    # 把要讓使用者看的資料丟出去
    user_input = interrupt({
        "question": "是否同意刪除?",
        "target": state["target"],
    })
    # user_input 會是使用者回傳的資料
    if user_input == "approve":
        return {"approved": True}
    return {"approved": False}
```

跑這個 graph 時:

```python
for chunk in graph.stream(
    {"target": "user-42"},
    config=config,
    stream_mode="values",
):
    print(chunk)

# 執行到 approval_node 時會停下來,state.next 會顯示節點名
print(graph.get_state(config).tasks)
# 包含 interrupt 資料
```

前端拿到 interrupt 資料後,收集使用者回應,再用 `Command(resume=...)` 繼續:

```python
graph.invoke(Command(resume="approve"), config=config)
```

## Command 的其他用途

`Command` 也能 **跳到特定 node**:

```python
def router(state):
    if state["type"] == "urgent":
        return Command(goto="escalate", update={"priority": "high"})
    return Command(goto="normal_flow")
```

在 node 中回傳 `Command` 比 `add_conditional_edges` 更直覺 — 節點自己決定下一步。

## 完整 HITL 範例

```python
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt, Command
from typing_extensions import TypedDict

class State(TypedDict):
    draft: str
    approved: bool

def write_draft(state):
    return {"draft": "這是草稿:...", "approved": False}

def human_review(state):
    answer = interrupt({
        "draft": state["draft"],
        "action": "請審核這份草稿",
    })
    return {"approved": answer == "approve"}

def publish(state):
    if state["approved"]:
        return {"draft": state["draft"] + " [已發布]"}
    return {"draft": state["draft"] + " [未通過]"}

builder = StateGraph(State)
builder.add_node("write", write_draft)
builder.add_node("review", human_review)
builder.add_node("publish", publish)
builder.add_edge(START, "write")
builder.add_edge("write", "review")
builder.add_edge("review", "publish")
builder.add_edge("publish", END)

graph = builder.compile(checkpointer=MemorySaver())

# 第一次跑
config = {"configurable": {"thread_id": "r1"}}
graph.invoke({}, config=config)

# 檢查
state = graph.get_state(config)
print(state.tasks[0].interrupts)   # 拿出 interrupt 資料
# 顯示給使用者,收集答案

# 使用者按「同意」
graph.invoke(Command(resume="approve"), config=config)

# 最終 state
print(graph.get_state(config).values)
# {'draft': '這是草稿:... [已發布]', 'approved': True}
```

## 什麼時候用靜態 vs interrupt()?

| | 靜態 breakpoint | interrupt() |
|---|----------------|-------------|
| 位置 | compile 時指定 | node 內 call |
| 資料 | 需手動讀 state | 直接傳 payload |
| 靈活度 | 固定節點停 | 條件判斷後才停 |
| 推薦度 | 老程式 | 新專案用這個 |

## 前端整合模式

典型 chat UI + HITL:

```
使用者傳訊 → 後端 graph.invoke(...)
   ↓
interrupt() → 後端回 { "pending": {question, data} }
   ↓
前端顯示審核 UI,使用者按 approve / reject
   ↓
前端送回 → 後端 graph.invoke(Command(resume=...))
   ↓
完成 → 回使用者
```

## 練習

用 interrupt() 做一個:Agent 寄 email 前,把 subject + body 給使用者確認。
