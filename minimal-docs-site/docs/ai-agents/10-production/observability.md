---
id: observability
title: Observability 與評估
sidebar_label: Observability
sidebar_position: 1
---

# Observability 與評估

生產級 Agent 必須能回答:

- 哪個使用者在什麼時候做了什麼?
- 延遲、token 成本多少?
- 哪些 prompt / tool 成功率高?

這就是 **Observability**。

## LangSmith Tracing

[Ch 02 LangSmith](../02-environment/langsmith.md) 已教基本開啟。生產環境額外要做:

### 1. 分 project

```python
import os
os.environ["LANGSMITH_PROJECT"] = f"prod-agent-{os.getenv('DEPLOY_ENV')}"
# 例如 prod-agent-staging, prod-agent-production
```

### 2. 帶 user_id / session_id 標記

```python
from langchain_core.runnables import RunnableConfig

config = RunnableConfig(
    tags=[f"user:{user_id}", f"session:{session_id}"],
    metadata={"user_id": user_id, "env": "prod"},
    run_name="customer-support",
)
agent.invoke(payload, config=config)
```

LangSmith UI 就能過濾「某使用者在某時段的所有 run」。

### 3. Feedback(使用者按讚/倒讚)

```python
from langsmith import Client

client = Client()
# 拿剛才的 run_id(trace 回來)
client.create_feedback(
    run_id=run_id,
    key="user_rating",
    score=1,  # or 0
    comment="答得很好",
)
```

再透過 LangSmith UI 分析哪些 prompt / tool 品質差。

## 評估(Evaluation)

### 建 Dataset

```python
from langsmith import Client
client = Client()

dataset = client.create_dataset("agent-regression")
examples = [
    ("公司今年產假幾天?", "產假為..."),
    ("幫我算 (3+4)*5", "35"),
]
for inp, ref in examples:
    client.create_example(
        inputs={"question": inp},
        outputs={"answer": ref},
        dataset_id=dataset.id,
    )
```

### 跑評估

```python
from langsmith.evaluation import evaluate

def my_agent(inputs):
    result = agent.invoke({"messages": [("human", inputs["question"])]})
    return {"answer": result["messages"][-1].content}

def correctness(run, example):
    # 用另一個 LLM 打分
    ...

evaluate(
    my_agent,
    data="agent-regression",
    evaluators=[correctness],
)
```

每次 agent 程式碼改動,跑一次看回歸。

## 記錄成本

```python
# 從 run 拿 token 用量
result = agent.invoke(payload)
for m in result["messages"]:
    if hasattr(m, "usage_metadata"):
        print(m.usage_metadata)
# {'input_tokens': 123, 'output_tokens': 45, 'total_tokens': 168}
```

LangSmith 會自動彙總全 project 的 token / cost。

## 常見 KPI

| 指標 | 目標 |
|------|------|
| P95 latency | < 5s(chat)、< 30s(deep research) |
| Token 成本/請求 | < $0.01(mini)、< $0.10(旗艦) |
| Tool 成功率 | > 95%(失敗會重試,但會放大延遲) |
| Grounded-ness(RAG 是否依資料回答) | > 90% |
| 使用者 thumbs-up 率 | > 80% |

## 警報

把 LangSmith 的異常指標接進 Slack / PagerDuty:

- P95 latency > 10s 連續 5 分鐘
- Error rate > 5%
- 單一使用者 run 數異常(濫用)

## 延伸

Self-hosted LangSmith:資料不出門的合規方案,LangChain 商業版。
