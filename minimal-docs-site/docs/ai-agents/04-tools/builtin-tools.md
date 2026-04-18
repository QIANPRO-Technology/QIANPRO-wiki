---
id: builtin-tools
title: 內建與社群 Tool
sidebar_label: 內建 Tool
sidebar_position: 2
---

# 內建與社群 Tool

不用重造輪子。LangChain 社群已有數百個現成 tool。

## 最常用

### Tavily(網路搜尋)

專為 LLM 設計的搜尋 API,回傳已整理的 snippet。

```python
# pip install langchain-tavily
from langchain_tavily import TavilySearch

search = TavilySearch(max_results=5)
result = search.invoke("台灣 2025 GDP")
print(result)  # list of {"url", "title", "content"}
```

需要 `TAVILY_API_KEY`。免費層夠課程用。

### DuckDuckGo(免 API key)

```python
# pip install duckduckgo-search
from langchain_community.tools import DuckDuckGoSearchRun

search = DuckDuckGoSearchRun()
print(search.invoke("LangChain 是什麼"))
```

### Python REPL

讓 Agent 跑 Python:

```python
from langchain_experimental.tools import PythonREPLTool

repl = PythonREPLTool()
print(repl.invoke("print(sum(range(100)))"))
# 4950
```

:::danger
PythonREPL 沒有沙箱!Agent 可以讀你的檔案系統。正式環境請用 Docker 或 E2B。
:::

### Wikipedia / Arxiv

```python
from langchain_community.tools import WikipediaQueryRun, ArxivQueryRun
from langchain_community.utilities import WikipediaAPIWrapper, ArxivAPIWrapper

wiki = WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper())
arxiv = ArxivQueryRun(api_wrapper=ArxivAPIWrapper())

print(wiki.invoke("LangChain"))
print(arxiv.invoke("attention is all you need"))
```

### Shell(`langchain_experimental`)

```python
from langchain_experimental.tools import ShellTool
shell = ShellTool()
print(shell.invoke("ls -la"))
```

同樣沒沙箱,教學用沒問題,別丟到生產環境。

## 檔案系統

```python
from langchain_community.tools.file_management import (
    ReadFileTool, WriteFileTool, ListDirectoryTool
)

tools = [
    ReadFileTool(),
    WriteFileTool(),
    ListDirectoryTool(),
]
```

可限制 `root_dir` 只讓 Agent 在指定資料夾動作。

## 把多個 tool 綁給 LLM

```python
from langchain_tavily import TavilySearch
from langchain_core.tools import tool
from langchain.chat_models import init_chat_model

@tool
def get_time() -> str:
    """取得現在的 UTC 時間"""
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()

tools = [TavilySearch(max_results=3), get_time]
llm = init_chat_model(
    "gemma4-31b",
    model_provider="openai",
    base_url="http://192.168.1.101:4000/v1",
    api_key="sk-你的-token",
    max_tokens=1024,
).bind_tools(tools)

resp = llm.invoke("現在幾點?台灣最近有什麼大新聞?")
for tc in resp.tool_calls:
    print(tc["name"], tc["args"])
```

LLM 會依問題挑對應的 tool。

## 目錄式清單

完整的 Integration 清單在 LangChain 官方站的 [integrations 目錄](https://docs.langchain.com/oss/python/integrations/tools/):

- 搜尋類:Tavily, Exa, SerpAPI, Brave, Google CSE
- 資料庫:SQL, MongoDB, Elasticsearch, Redis
- 雲端服務:AWS S3, Azure Cognitive Services, GCP
- 通訊:Slack, Gmail, Twilio, Telegram
- 開發工具:GitHub, Jira, Notion
- 瀏覽器:Playwright, Browserbase, Selenium

## 練習

1. 組一個 tool list:Tavily + Python REPL + get_time,問 Agent「計算距 2026 年底還有幾天」。
2. 用 `stream_mode="updates"` 觀察 LLM 挑對 tool 了嗎?
