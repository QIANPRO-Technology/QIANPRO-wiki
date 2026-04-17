---
id: langsmith
title: LangSmith 追蹤
sidebar_label: LangSmith
sidebar_position: 5
---

# LangSmith 追蹤

**LangSmith** 是 LangChain 官方的可觀測性平台,能把 Agent 每一步(prompt、工具呼叫、回傳值)完整錄下,對教學與除錯都非常有用。

## 為什麼開發 Agent 一定要開?

Agent 的黑盒程度比一般 LLM 應用高:

- 它可能呼叫 3 個工具才回答
- 它可能進入迴圈
- 它可能 hallucinate 工具參數

沒有 trace,你只看到「壞掉了」;有 trace,你看到每一步發生什麼。

## 快速設定

1. 到 [smith.langchain.com](https://smith.langchain.com) 建帳號,拿 API key。
2. 在 `.env` 加入:

```env
LANGSMITH_API_KEY=ls__...
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=ai-agent-course
```

3. 載入 env,跑你的 LangChain 程式,trace 會自動送到 LangSmith。

```python
from dotenv import load_dotenv
load_dotenv()

from langchain_openai import ChatOpenAI
llm = ChatOpenAI(model="gpt-4o-mini")
llm.invoke("hi")  # 這一呼叫會自動被追蹤
```

打開 LangSmith UI 就能看到剛才那次呼叫。

## Trace 介面怎麼看

:::info 截圖
上課時會展示 LangSmith Trace 介面的實際畫面。
:::

一個典型的 Agent run 樹狀結構:

```
Agent run
├── Plan (LLM call)
│   ├── input: { messages, tools }
│   ├── output: { tool_calls: [search("X")] }
│   └── latency: 1.2s, tokens: 340
├── Tool: search
│   ├── args: { "query": "X" }
│   ├── output: [...結果...]
│   └── latency: 0.8s
└── Final answer (LLM call)
    ├── input: { messages + tool result }
    └── output: "答案..."
```

每一層都能展開看 prompt、輸出、token 成本、延遲。

## 在課程中的建議用法

### 1. 建不同 project

每個章節用不同 `LANGSMITH_PROJECT`:

```env
# Ch 03
LANGSMITH_PROJECT=ch03-langchain-core
# Ch 05
LANGSMITH_PROJECT=ch05-langgraph
```

這樣 trace 不會混在一起。

### 2. 用 run name 標記

```python
from langchain_core.runnables import RunnableConfig
config = RunnableConfig(run_name="學員作業-王小明", tags=["ch04", "hw"])
agent.invoke({"input": "..."}, config=config)
```

老師可以用 tag 過濾找到學員的 run。

### 3. 建立資料集 + 評估

LangSmith 也提供 Dataset / Evaluation 功能,後面 Ch 10 會用。

## 進階:自動評估

```python
from langsmith import Client
client = Client()

# 把課堂範例存成資料集
client.create_dataset("ch04-tool-use-examples")
```

延伸看 [Ch 10 LangSmith 評估](../10-production/observability.md)。

## 注意事項

:::warning
LangSmith 會收集你的 prompt 與模型輸出。教學用的資料沒問題,但公司敏感資料進來前,要確認合規(或切換到 self-hosted LangSmith)。
:::

## 下一步

進入 [Ch 03 LangChain 核心](../03-langchain-core/overview.md),開始寫第一個 Agent。
