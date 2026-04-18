---
id: vector-stores
title: Vector Store 實作
sidebar_label: Vector Store
sidebar_position: 2
---

# Vector Store 實作

## 通用介面

LangChain 把所有 vector store 包成統一介面:

```python
vs.add_documents([doc1, doc2, ...])
vs.similarity_search(query, k=4)
vs.similarity_search_with_score(query, k=4)  # 帶分數
retriever = vs.as_retriever(search_kwargs={"k": 4})
```

## Chroma(教學首選)

```python
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

# In-memory
vs = Chroma(embedding_function=OpenAIEmbeddings())

# 持久化
vs = Chroma(
    collection_name="handbook",
    embedding_function=OpenAIEmbeddings(),
    persist_directory="./chroma_db",
)

vs.add_documents(docs)
# 會自動寫盤

# 下次載入
vs = Chroma(
    collection_name="handbook",
    embedding_function=OpenAIEmbeddings(),  # 必須用同一個 embedding
    persist_directory="./chroma_db",
)
```

## PGVector

公司已有 Postgres:

```bash
# 在 PG 裝 pgvector 擴充
CREATE EXTENSION vector;
```

```python
from langchain_postgres import PGVector

vs = PGVector(
    connection="postgresql://user:pw@localhost/db",
    collection_name="handbook",
    embeddings=OpenAIEmbeddings(),
)
```

## Metadata 過濾

```python
# add 時帶 metadata
from langchain_core.documents import Document
doc = Document(
    page_content="...",
    metadata={"source": "hr", "year": 2025, "public": False},
)
vs.add_documents([doc])

# 查詢時過濾
results = vs.similarity_search(
    "休假",
    k=4,
    filter={"source": "hr", "year": 2025},
)
```

## Hybrid Search(向量 + 關鍵字)

純向量有時找不到精確關鍵字(如法規編號)。混合搜尋:

```python
from langchain.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever

vector_retriever = vs.as_retriever(search_kwargs={"k": 4})
bm25_retriever = BM25Retriever.from_documents(docs)
bm25_retriever.k = 4

ensemble = EnsembleRetriever(
    retrievers=[vector_retriever, bm25_retriever],
    weights=[0.6, 0.4],
)
results = ensemble.invoke("第 42 條第 3 項")
```

## Rerank(進階)

先向量取 20 筆,再用 cross-encoder 精排:

```python
from langchain.retrievers import ContextualCompressionRetriever
from langchain_community.cross_encoders import HuggingFaceCrossEncoder
from langchain.retrievers.document_compressors import CrossEncoderReranker

cross = HuggingFaceCrossEncoder(model_name="BAAI/bge-reranker-v2-m3")
reranker = CrossEncoderReranker(model=cross, top_n=4)

compressed = ContextualCompressionRetriever(
    base_retriever=vs.as_retriever(search_kwargs={"k": 20}),
    base_compressor=reranker,
)
```

品質顯著提升,代價是多一次 batch 推論(cross-encoder 很快)。

## 地端 Embedding 的概念

Embedding 模型同樣可以架在內網、提供 OpenAI 相容介面。LangChain 端只要指定 `base_url`:

```python
from langchain_openai import OpenAIEmbeddings

emb = OpenAIEmbeddings(
    model="bge-m3",
    base_url="http://embedding-gateway/v1",  # infra 團隊提供
    api_key="EMPTY",
)
```

整條鏈都不需走雲端。
