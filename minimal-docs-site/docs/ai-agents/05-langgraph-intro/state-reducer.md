---
id: state-reducer
title: State 與 Reducer
sidebar_label: State & Reducer
sidebar_position: 3
---

# State 與 Reducer

上一節 State 只有一個 `str` 欄位,實務上通常比較複雜 — 特別是訊息列表會 **累加** 而不是覆蓋。

## 預設:覆蓋

```python
class State(TypedDict):
    count: int

def node(state): return {"count": 10}
# 不管原本 count 是多少,都會被換成 10
```

## 累加:用 Reducer

當你希望「Node 回傳值與原值合併」,就要定義 **Reducer**。最常見是 append:

```python
from typing import Annotated
from operator import add
from typing_extensions import TypedDict

class State(TypedDict):
    nums: Annotated[list[int], add]

def node_a(state): return {"nums": [1, 2]}
def node_b(state): return {"nums": [3]}

# 跑完後 state["nums"] = [] + [1,2] + [3] = [1,2,3]
```

`Annotated[list[int], add]` 告訴 LangGraph:新值與舊值要用 `add(old, new)` 合併。

## 訊息用的 Reducer:`add_messages`

訊息列表有特殊需求:

- 新訊息 append
- 同 ID 訊息要覆蓋(用於編輯)
- 自動加 ID

LangGraph 內建 `add_messages`:

```python
from langgraph.graph import add_messages
from langchain_core.messages import AnyMessage

class State(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]
```

或用預定義的 `MessagesState`:

```python
from langgraph.graph import MessagesState

class AgentState(MessagesState):
    # 繼承 messages 欄位,想加其他欄位直接加
    user_id: str
```

## 多欄位的 State

```python
from typing import Annotated
from langgraph.graph import MessagesState
from operator import add

class ResearchState(MessagesState):
    sources: Annotated[list[str], add]  # 累加
    final_answer: str                    # 覆蓋
    step_count: int                      # 覆蓋
```

## 自訂 Reducer

```python
def merge_dicts(old: dict, new: dict) -> dict:
    return {**old, **new}

class State(TypedDict):
    config: Annotated[dict, merge_dicts]
```

## 多節點並行時的重要性

Reducer 最關鍵的用途是 **並行節點**:

```
          ↗ search_web → 結果1 ↘
   start →                       merge → end
          ↘ search_docs → 結果2 ↗
```

兩個 search 節點會 **並行執行**,都 return `{"sources": [...]}`。如果用覆蓋,後寫的會贏 — 用 `add` 兩個結果都保留。

## Reducer 選擇指南

| 欄位型別 | Reducer | 用途 |
|---------|---------|------|
| `list` | `add`(operator.add) | append |
| `list[Message]` | `add_messages` | 訊息專用 |
| `dict` | 自訂(如 merge) | 設定 / cache |
| `set` | `lambda a, b: a \| b` | 去重集合 |
| 單值 | 不寫(預設覆蓋) | 計數、旗標 |

## 練習

- 建立 `SearchState`,同時有 `query`(覆蓋)和 `results`(累加)。
- 寫 3 個並行 Node 各回傳 1 筆結果,執行後看 `results` 是否 3 筆都在。
