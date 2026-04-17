---
id: mcp
title: MCP 協定
sidebar_label: MCP
sidebar_position: 4
---

# MCP 協定(Model Context Protocol)

**MCP** 是 Anthropic 在 2024 推出的協定,讓 LLM 應用能用標準方式連接 **外部工具、資料、prompt**。

把它想成「LLM 世界的 USB-C」:MCP server 提供 tools/resources,任何 MCP client(Claude Desktop、Cursor、LangChain)都能用。

## 為什麼重要?

LangChain 的 tool 是 **程式碼內建**,每個專案重寫一次。MCP 把 tool 做成 **服務**,多個應用共用:

- 公司的 Jira / Confluence / GitHub 做成一個 MCP server
- Claude Desktop、Cursor、LangChain Agent 都能用
- 權限、驗證、log 集中管理

## LangChain 使用 MCP Server

```bash
pip install langchain-mcp-adapters
```

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

client = MultiServerMCPClient({
    "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
        "transport": "stdio",
    },
    "github": {
        "url": "http://localhost:3000/mcp",
        "transport": "streamable_http",
    },
})

# 拿到所有 tools
tools = await client.get_tools()
# 一般用法
from langchain.agents import create_agent
agent = create_agent(model=llm, tools=tools)
```

## 把你的 LangChain Agent 暴露成 MCP Server

方向反過來 — 別人(Claude Desktop)也能呼叫你的 Agent:

```python
# 用官方 mcp SDK
from mcp.server import Server
from mcp.types import Tool

server = Server("my-agent")

@server.list_tools()
async def list_tools():
    return [Tool(
        name="my_agent",
        description="我的 LangGraph Agent",
        inputSchema={"type":"object","properties":{"q":{"type":"string"}}}
    )]

@server.call_tool()
async def call_tool(name, args):
    result = await graph.ainvoke({"messages":[("human", args["q"])]})
    return [TextContent(type="text", text=result["messages"][-1].content)]
```

## 生態

| MCP Server | 功能 |
|------------|------|
| filesystem | 讀寫本地檔 |
| github | Issues / PR |
| slack | 讀訊息、發訊息 |
| gdrive | Google Drive |
| postgres | 查 DB |
| brave-search | 搜尋 |

[官方清單](https://github.com/modelcontextprotocol/servers) 超過 100 個。

## A2A(Agent-to-Agent)

Google 在 2025 推出的協定,讓 Agent 之間能溝通。LangChain 有 A2A 整合,但目前使用場景比 MCP 窄。

## 課程小結(Ch 10)

| 主題 | 要點 |
|------|------|
| Observability | LangSmith + run tags + feedback |
| 部署 | LangGraph Platform / FastAPI / DGX 在地 |
| Guardrails | 輸入 / Tool / 輸出 三層防線 |
| MCP | 把工具當服務,跨應用共用 |

## 課程結語

恭喜走完!到這裡你可以:

- ✅ 理解 Agent 設計原則與適用情境
- ✅ 用 LangChain 組基本元件
- ✅ 用 LangGraph 建複雜工作流
- ✅ 做 Memory / HITL / Multi-Agent / RAG
- ✅ 部署到本地 vLLM,串接 LangSmith

下一步建議:

1. 挑一個 Ch 08 / Ch 09 的範例,改造成跟你真實業務有關的場景
2. 在 DGX Spark 上跑一次完整鏈路,體會地端效能
3. 觀摩 [LangChain Academy](https://github.com/langchain-ai/langchain-academy) 的進階 notebook
4. 讀 [Anthropic: Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)

祝教學順利 💪
