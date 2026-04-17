---
id: python-setup
title: Python 環境準備
sidebar_label: Python 環境
sidebar_position: 1
---

# Python 環境準備

## 版本要求

- Python **3.11 / 3.12 / 3.13**(LangGraph 需要 3.11+)
- 建議用 `uv` 或 `venv` 隔離環境

## 建立虛擬環境

```bash
# 用內建 venv
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate
```

或用更快的 `uv`:

```bash
pip install uv
uv venv --python 3.12
source .venv/bin/activate
```

## 安裝核心套件

建一個 `requirements.txt`:

```text
# LangChain 核心
langchain>=0.3
langchain-core>=0.3
langchain-community>=0.3

# LLM 供應商
langchain-openai>=0.2
langchain-anthropic>=0.2

# LangGraph
langgraph>=0.2
langgraph-checkpoint-sqlite

# 向量資料庫與 Embedding
langchain-chroma
chromadb

# 工具
tavily-python       # 網路搜尋
duckduckgo-search

# Observability
langsmith>=0.1

# 實用
python-dotenv
rich
```

安裝:

```bash
pip install -r requirements.txt
```

## 環境變數

建一個 `.env` 在專案根目錄:

```env
# OpenAI(或自架 vLLM)
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1   # 自架 vLLM 改這裡

# LangSmith(免費可用,強烈建議開)
LANGSMITH_API_KEY=ls__...
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=ai-agent-course

# 其他工具
TAVILY_API_KEY=tvly-...
ANTHROPIC_API_KEY=sk-ant-...
```

:::tip `.env` 加進 `.gitignore`
永遠不要把 API key commit 進 git。範本另存為 `.env.example`。
:::

程式中載入:

```python
from dotenv import load_dotenv
load_dotenv()  # 自動讀 .env
```

## 驗證安裝

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
print(llm.invoke("用一句話介紹你自己").content)
```

看到回覆就代表環境 OK。

## 推薦 IDE 設定

| 工具 | 用途 |
|------|------|
| **VS Code + Pylance** | 型別提示 |
| **Jupyter** | 做 notebook 實驗 |
| **LangSmith UI** | 視覺化 Agent trace |
| **LangGraph Studio** | 視覺化 Graph 執行流程 |

## 專案結構建議

```
ai-agent-demo/
├── .env                # 不進 git
├── .env.example
├── .gitignore
├── requirements.txt
├── README.md
├── src/
│   ├── agents/         # Agent 定義
│   ├── tools/          # 自訂工具
│   ├── prompts/        # Prompt 模板
│   └── main.py
├── tests/
└── notebooks/          # 教學用
```

## 下一步

- 取得 [LLM 供應商 API key](./llm-providers)
- 如果有 DGX Spark 硬體,接著看 [vLLM 部署](./vllm-dgx-spark)
- 開啟 [LangSmith 追蹤](./langsmith)
