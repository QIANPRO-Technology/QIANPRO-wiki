---
id: agent-tool-loop
title: Agent Loop 完整範例
sidebar_label: Agent Loop
sidebar_position: 4
---

# Agent Loop 完整範例

把 Tool Use 串成可運作的 Agent — 這是 **ReAct pattern**(Reasoning + Acting)的核心。

## 手工版:看清楚每一步

```python
from langchain_core.messages import HumanMessage, ToolMessage, SystemMessage
from langchain_core.tools import tool
from langchain.chat_models import init_chat_model

@tool
def multiply(a: int, b: int) -> int:
    """兩數相乘"""
    return a * b

@tool
def add(a: int, b: int) -> int:
    """兩數相加"""
    return a + b

tools = [multiply, add]
tool_map = {t.name: t for t in tools}

llm = init_chat_model("gpt-4o-mini", model_provider="openai").bind_tools(tools)

messages = [
    SystemMessage("你是計算機,只能用給的工具,最多 5 步。"),
    HumanMessage("(3 + 4) * 5 = ?"),
]

for step in range(5):
    resp = llm.invoke(messages)
    messages.append(resp)

    if not resp.tool_calls:
        print("Final:", resp.content)
        break

    for tc in resp.tool_calls:
        print(f"[step {step}] 呼叫 {tc['name']}({tc['args']})")
        result = tool_map[tc["name"]].invoke(tc["args"])
        messages.append(ToolMessage(str(result), tool_call_id=tc["id"]))
```

預期輸出:

```
[step 0] 呼叫 add({'a': 3, 'b': 4})
[step 1] 呼叫 multiply({'a': 7, 'b': 5})
Final: (3 + 4) * 5 = 35
```

LLM 自己拆了兩步:先加再乘。這就是 ReAct。

## 官方版:`create_agent()`(推薦)

上面的 loop 寫死在 Python,不方便加 checkpoint、HITL、並行。LangGraph 提供 `create_agent` 幫你處理好:

```python
from langchain.agents import create_agent
from langchain.chat_models import init_chat_model

llm = init_chat_model("gpt-4o-mini", model_provider="openai")
agent = create_agent(model=llm, tools=[multiply, add])

result = agent.invoke({
    "messages": [{"role": "user", "content": "(3 + 4) * 5 = ?"}]
})
print(result["messages"][-1].content)
```

:::tip LangChain 1.x 新 API
- `from langchain.agents import create_agent`(LangChain 1.0+,**本課程使用**)
- 底層仍是 LangGraph 實作;舊的 `langchain.agents.AgentExecutor` 已 deprecated
- `langgraph.prebuilt.create_react_agent` 仍可用,但語意較 legacy
:::

## 加系統 prompt

```python
agent = create_agent(
    model=llm,
    tools=[multiply, add],
    prompt="你是謹慎的數學助教,每一步都要驗算。",
)
```

## 限制步數

防止無限迴圈:

```python
from langgraph.graph import END
agent = create_agent(model=llm, tools=tools)

# 在 invoke 時限制
result = agent.invoke(
    {"messages": [...]},
    config={"recursion_limit": 10},  # 最多 10 步
)
```

## 串流 Agent 執行

```python
for chunk in agent.stream(
    {"messages": [{"role": "user", "content": "..."}]},
    stream_mode="values",
):
    last = chunk["messages"][-1]
    last.pretty_print()
```

## 觀察執行過程

用 `stream_mode="updates"` 把每一步印出來,就有完整樹狀結構:

```
agent
├── tool call: add({a:3, b:4})
├── tool: add → 7
├── tool call: multiply({a:7, b:5})
├── tool: multiply → 35
└── final: "= 35"
```

這對除錯與教學極有價值。生產環境可以串接 observability 平台(見 Ch 10)把這些資訊集中收集。

## Ch 04 總結

到這裡你已經可以:

- ✅ 用 `@tool` 定義自訂工具
- ✅ 用 `with_structured_output` 讓 LLM 產出結構資料
- ✅ 用 `create_agent` 讓 LLM 自動呼叫工具
- ✅ 用 stream 觀察每一步

下一章我們 **拆開 `create_agent` 的黑盒**,看 LangGraph 怎麼組出這個 Loop。

## 練習

1. 加一個 `divide(a, b)` 工具,注意除以 0 要處理。
2. 在同一題上比較 `gemma4-31b` 與 `qwen3-14b` 的工具呼叫成功率。
3. 問 Agent:「把 100 除以 0,再乘 5」 — 觀察它怎麼處理錯誤。
