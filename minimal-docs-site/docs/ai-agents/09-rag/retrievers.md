---
id: retrievers
title: Retriever 模式
sidebar_label: Retriever
sidebar_position: 3
---

# Retriever 模式

Retriever 是「**輸入 query,輸出文件**」的抽象。內建許多進階模式。

## 1. MultiQueryRetriever

LLM 自動把使用者 query 改寫成多個版本,每個都查:

```python
from langchain.retrievers import MultiQueryRetriever

mqr = MultiQueryRetriever.from_llm(
    retriever=vs.as_retriever(),
    llm=llm,
)
results = mqr.invoke("公司的假期規定")
# 背後會生成 3-5 個改寫 query 分別查,再合併去重
```

對 query 模糊不清時很有幫助。

## 2. SelfQueryRetriever(從問題抽 filter)

自動把「2024 年 HR 相關文件」轉成 `{"source":"hr","year":2024}` filter:

```python
from langchain.retrievers.self_query.base import SelfQueryRetriever
from langchain.chains.query_constructor.schema import AttributeInfo

metadata_info = [
    AttributeInfo(name="source", description="來源部門", type="string"),
    AttributeInfo(name="year", description="發布年份", type="integer"),
]

sqr = SelfQueryRetriever.from_llm(
    llm=llm,
    vectorstore=vs,
    document_contents="公司規章條文",
    metadata_field_info=metadata_info,
)
sqr.invoke("2024 年 HR 的休假規定")
```

## 3. ParentDocumentRetriever

小 chunk 查得準,大 chunk 含上下文 — 兼顧兩者:

```python
from langchain.retrievers import ParentDocumentRetriever
from langchain.storage import InMemoryStore

pdr = ParentDocumentRetriever(
    vectorstore=vs,                             # 存小 chunk 的向量
    docstore=InMemoryStore(),                   # 存大 chunk 本體
    child_splitter=RecursiveCharacterTextSplitter(chunk_size=400),
    parent_splitter=RecursiveCharacterTextSplitter(chunk_size=2000),
)
pdr.add_documents(docs)

pdr.invoke("...")   # 查小 chunk,回大 chunk 當 context
```

## 4. EnsembleRetriever(混合多個)

見 [Vector Store 的 Hybrid Search](./vector-stores#hybrid-search向量--關鍵字)。

## 5. 自訂 Retriever

```python
from langchain_core.retrievers import BaseRetriever
from langchain_core.documents import Document

class MyRetriever(BaseRetriever):
    def _get_relevant_documents(self, query: str) -> list[Document]:
        # 自訂邏輯 — 呼公司內部 API、查 ES...
        ...
        return docs
```

## 與 Agent 整合

把 Retriever 包成 tool,讓 Agent 自己決定何時查:

```python
from langchain.agents import create_agent
from langchain.tools.retriever import create_retriever_tool

retriever_tool = create_retriever_tool(
    retriever=vs.as_retriever(),
    name="search_handbook",
    description="查詢公司員工手冊。適合查詢休假、薪資、規章等問題。",
)

agent = create_agent(model=llm, tools=[retriever_tool])
```

這就是下一節 **Agentic RAG** 的基礎 — Agent 自己決定要不要查、查什麼、查幾次。
