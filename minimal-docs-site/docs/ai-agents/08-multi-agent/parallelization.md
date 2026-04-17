---
id: parallelization
title: 平行化(Parallelization)
sidebar_label: 平行化
sidebar_position: 3
---

# 平行化(Parallelization)

LangGraph 支援 **從一個 node 分散出多個 node 並行**。

## Fan-out & Fan-in

```python
from typing import Annotated
from operator import add
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END

class State(TypedDict):
    topic: str
    results: Annotated[list[str], add]   # 注意 reducer!

def search_web(state): return {"results": [f"[web] {state['topic']}"]}
def search_wiki(state): return {"results": [f"[wiki] {state['topic']}"]}
def search_arxiv(state): return {"results": [f"[arxiv] {state['topic']}"]}

def combine(state):
    return {"results": [f"合併結果:{state['results']}"]}

builder = StateGraph(State)
builder.add_node("web", search_web)
builder.add_node("wiki", search_wiki)
builder.add_node("arxiv", search_arxiv)
builder.add_node("combine", combine)

# Fan-out:從 START 同時去 3 個 node
builder.add_edge(START, "web")
builder.add_edge(START, "wiki")
builder.add_edge(START, "arxiv")

# Fan-in:3 個都進 combine
builder.add_edge("web", "combine")
builder.add_edge("wiki", "combine")
builder.add_edge("arxiv", "combine")
builder.add_edge("combine", END)

graph = builder.compile()
print(graph.invoke({"topic": "LangChain", "results": []}))
```

LangGraph 會 **平行** 跑三個 search,三個都完成才進 combine。

:::tip
reducer 用 `add`(list 的 concatenation)才能把三個結果都保留。用預設覆蓋會只剩最後一個。
:::

## Send API:動態 Fan-out

不知道要 fan-out 幾個時:

```python
from langgraph.types import Send

def plan(state) -> list[Send]:
    # 依 state 決定要送給誰、送什麼
    return [
        Send("worker", {"task": t}) for t in state["tasks"]
    ]

def worker(state):
    return {"results": [f"done {state['task']}"]}

builder = StateGraph(State)
builder.add_node("plan", plan)
builder.add_node("worker", worker)
builder.add_edge(START, "plan")
# plan 回傳 list[Send] 時,會並行觸發 worker
# 每個 worker 收到自己的 task(獨立 state)
```

這是 **Map-Reduce** 的 LangGraph 表達方式。

## 典型應用

| 應用 | Fan-out | Fan-in |
|------|--------|--------|
| 多源搜尋 | 各家引擎平行 | merge results |
| 批次文件摘要 | 每份文件一個 Send | concat summary |
| 多角度評分 | 多個評審 Agent | 投票 |
| A/B 模型比較 | 不同 LLM 同題 | 比較答案 |

## 效能注意

並行 **不會省 token**,只省牆上時間。LLM API 通常有 rate limit,並行太多會 429。配:

```python
graph = builder.compile()
graph.invoke(input, config={"max_concurrency": 5})
```

## 練習

用 Send 做一個「平行翻譯」:使用者給一段中文,Agent 平行翻譯成英日韓三語,最後 combine。
