---
id: prompts
title: Prompt Template
sidebar_label: Prompt Template
sidebar_position: 3
---

# Prompt Template

把 prompt 參數化,才能重複使用、版本管理、A/B 測試。

## ChatPromptTemplate

最常用的形式:

```python
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一位{role},回答必須簡潔。"),
    ("human", "{question}"),
])

messages = prompt.invoke({
    "role": "SQL 專家",
    "question": "怎麼查詢最貴的前 10 筆訂單?"
})
# messages 是 ChatPromptValue,可以直接 llm.invoke(messages)
```

與 model 串起來:

```python
chain = prompt | llm
chain.invoke({"role": "SQL 專家", "question": "..."})
```

## 插入歷史訊息

用 `MessagesPlaceholder`:

```python
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

prompt = ChatPromptTemplate.from_messages([
    ("system", "你是助教"),
    MessagesPlaceholder("history"),
    ("human", "{input}"),
])

chain = prompt | llm
chain.invoke({
    "history": [
        HumanMessage("list comp 怎麼用"),
        AIMessage("[expr for x in iterable]"),
    ],
    "input": "加條件呢?",
})
```

## Few-shot

給範例讓 LLM 學格式:

```python
from langchain_core.prompts import FewShotChatMessagePromptTemplate

examples = [
    {"input": "3 + 4", "output": "7"},
    {"input": "5 * 6", "output": "30"},
]

example_prompt = ChatPromptTemplate.from_messages([
    ("human", "{input}"),
    ("ai", "{output}"),
])

few_shot = FewShotChatMessagePromptTemplate(
    example_prompt=example_prompt,
    examples=examples,
)

final = ChatPromptTemplate.from_messages([
    ("system", "你是算術機器,只輸出答案"),
    few_shot,
    ("human", "{input}"),
])

chain = final | llm
print(chain.invoke({"input": "9 + 10"}).content)  # "19"
```

## Prompt 版本管理

生產環境 Prompt 變動頻繁,建議把 prompt 當程式碼管理:

1. **放在 repo 裡** — 每個 prompt 一個 `.md` 或 `.py` 檔,走 PR review
2. **用環境變數切版本** — `PROMPT_VERSION=v2` 切換,方便 A/B 測試
3. **記錄到 log** — 每次 invoke 都帶上 prompt hash 或版本號,出問題能追溯

```python
# 簡單版:prompt 當 python module
# prompts/research.py
from langchain_core.prompts import ChatPromptTemplate

RESEARCH_PROMPT_V1 = ChatPromptTemplate.from_messages([
    ("system", "你是研究員..."),
    ("human", "{question}"),
])
```

使用時 import:

```python
from prompts.research import RESEARCH_PROMPT_V1
chain = RESEARCH_PROMPT_V1 | llm
```

## 寫好 Prompt 的檢查清單

- [ ] **明確角色** — 「你是...」
- [ ] **明確任務** — 輸入什麼、要做什麼
- [ ] **明確輸出格式** — JSON? Markdown? 純文字?
- [ ] **明確約束** — 不能輸出什麼、字數限制
- [ ] **範例(few-shot)** — 複雜格式一定要給
- [ ] **拆解步驟** — 複雜任務列 1. 2. 3.

## 練習

寫一個 prompt,輸入是一段 Python code,輸出是 `{bug: str, fix: str, explanation: str}` 格式。

提示:Structured Output 在下一節會教更好的寫法。
