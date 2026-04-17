---
id: time-travel
title: Time Travel(時光倒流)
sidebar_label: Time Travel
sidebar_position: 4
---

# Time Travel(時光倒流)

Checkpointer 儲存了每一步 state,你可以 **回到任何過去的點** 重新執行,等同 Git 的 `checkout`。

## 取得歷史

```python
config = {"configurable": {"thread_id": "r1"}}
for snap in graph.get_state_history(config):
    print(snap.values, snap.next, snap.config)
```

每個 snapshot 都有獨立的 `config`(帶 `checkpoint_id`)。

## 倒回去重跑

```python
# 挑一個 checkpoint
history = list(graph.get_state_history(config))
target = history[3]   # 假設要回到第 3 步之前

# 從那個 checkpoint 繼續執行
for chunk in graph.stream(None, config=target.config, stream_mode="values"):
    print(chunk)
```

## 倒回去 + 改 state(分岔)

在 checkpoint 上 `update_state`,會建立新分支:

```python
# 拿第 3 步的 config
target_config = history[3].config

# 改 state
new_config = graph.update_state(
    target_config,
    {"messages": [HumanMessage("改變主意,改走 plan B")]},
)

# 從新 branch 繼續
graph.invoke(None, config=new_config)
```

`new_config` 帶的 `checkpoint_id` 指向分岔點。原本的歷史不受影響 — 可以有多個 branch 平行存在。

## 使用情境

| 情境 | 怎麼用 |
|------|--------|
| Agent 走偏了要重來 | 回到分岔點改 prompt |
| A/B 比較不同策略 | 同 checkpoint 開兩個 branch |
| 教學:展示不同決定的結果 | 讓學生修改參數看結果差異 |
| 除錯 | 回到出錯前一步重跑 |

## 視覺化

LangGraph Studio 有 time travel UI — 直接在瀏覽器點每個 checkpoint,分岔、比較。搭配 LangSmith trace 效果很好。

## Ch 07 總結

到這裡你能:

- ✅ 用靜態 breakpoint 在 node 前停
- ✅ 用 `interrupt()` + `Command(resume=...)` 做優雅的 HITL
- ✅ 用 `update_state` 改 state
- ✅ 用 `get_state_history` 回到過去

這四個功能組合,能蓋住 90% 的 HITL 需求。

下一章:**多個 Agent 協作**。
