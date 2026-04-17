---
id: edit-state
title: 編輯 State
sidebar_label: 編輯 State
sidebar_position: 3
---

# 編輯 State

停下來不只能「同意/拒絕」— 還能 **直接改 state**,讓 Agent 依修改後的內容繼續。

## update_state API

```python
graph.update_state(
    config,
    {"messages": [...]},       # 要合併進 state 的資料
    as_node="some_node",        # 模擬這筆更新來自該 node
)
```

## 修改最後一條 AI 訊息

假設 LLM 回的 tool call 帶錯參數,你想修:

```python
# 拿當前 state
state = graph.get_state(config)
last = state.values["messages"][-1]
print(last.tool_calls)
# [{"name": "delete_user", "args": {"user_id": "abc"}, "id": "call_1"}]

# 改 args
new_msg = last.model_copy(update={
    "tool_calls": [
        {**last.tool_calls[0], "args": {"user_id": "abc", "soft_delete": True}}
    ]
})

# 用同一個 id 覆蓋(add_messages reducer 看 id 判斷)
graph.update_state(config, {"messages": [new_msg]})

# 繼續
graph.invoke(None, config=config)
```

## 新增一條訊息(讓 Agent 有方向)

例如 Agent 卡在某步,你直接告訴它怎麼做:

```python
from langchain_core.messages import HumanMessage

graph.update_state(
    config,
    {"messages": [HumanMessage("其實你應該先查客戶資料,再決定是否扣款")]}
)
graph.invoke(None, config=config)
```

## 配合 interrupt_before

結合 Ch 07-1 的 static breakpoint:

```python
graph = builder.compile(
    checkpointer=memory,
    interrupt_before=["tools"],
)

# 執行到 tools 前停
graph.invoke({"messages": [user_msg]}, config=config)

# 老師審核 LLM 決定的 tool call
state = graph.get_state(config)
# 發現參數錯了,改
graph.update_state(config, {"messages": [fixed_msg]})

# 繼續
graph.invoke(None, config=config)
```

## 教學價值

這個功能在課堂極好用:

- 學生寫的 prompt 讓 Agent 跑偏 → 老師即時改 state 讓 Agent 回到正軌
- 展示「Agent 為什麼這樣決定」,修改後看結果差異

## 練習

1. 寫一個 graph,故意讓 Agent 做錯決定,然後用 `update_state` 修正,觀察後續流程。
2. 結合 [Time Travel](./time-travel),把修正作為「分岔」而非覆蓋。
