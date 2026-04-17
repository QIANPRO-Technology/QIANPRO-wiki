---
id: custom-tools
title: 自訂 Tool
sidebar_label: 自訂 Tool
sidebar_position: 3
---

# 自訂 Tool

90% 的專案都要自己寫 tool — 呼內部 API、查 DB、查公司知識庫。

## 最簡單:`@tool` decorator

```python
from langchain_core.tools import tool

@tool
def add(a: int, b: int) -> int:
    """計算兩個整數的和。"""
    return a + b

# 直接呼叫
print(add.invoke({"a": 1, "b": 2}))  # 3
# Schema
print(add.args_schema.model_json_schema())
```

## 指定 schema

用 Pydantic 精確控制參數說明:

```python
from pydantic import BaseModel, Field
from langchain_core.tools import tool

class QuerySchema(BaseModel):
    table: str = Field(description="資料表名稱,只能是 orders / customers")
    since: str = Field(description="起始日期 ISO 8601")

@tool(args_schema=QuerySchema)
def query_db(table: str, since: str) -> str:
    """查詢資料庫中某張表在指定日期之後的紀錄。"""
    # ... 實際查 DB
    return f"{table} since {since}: 42 rows"
```

## 加錯誤處理

```python
from langchain_core.tools import tool

@tool(return_direct=False, handle_tool_error=True)
def risky_tool(x: int) -> str:
    """可能出錯的工具"""
    if x < 0:
        raise ValueError("x 必須 >= 0")
    return str(x * 2)
```

`handle_tool_error=True` 時,例外會被轉成 `ToolMessage` 的字串內容,讓 LLM 可以讀到錯誤並重試。

## 呼叫外部 API

```python
import requests
from langchain_core.tools import tool

@tool
def get_stock_price(symbol: str) -> str:
    """查詢股票即時價格。

    Args:
        symbol: 股票代號,如 "AAPL", "TSLA", "2330.TW"
    """
    resp = requests.get(
        f"https://api.example.com/quote/{symbol}",
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    return f"{symbol} ${data['price']:.2f}"
```

## 非同步 Tool

```python
import httpx

@tool
async def fetch_url(url: str) -> str:
    """抓指定 URL 的 HTML 內容"""
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, timeout=30)
        return resp.text[:2000]
```

async tool 要用 `ainvoke` / `astream` 才有效果。

## Class 形式(更複雜的狀態)

```python
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

class SqlQueryInput(BaseModel):
    query: str = Field(description="SQL 查詢語句,限唯讀")

class SqlQueryTool(BaseTool):
    name: str = "sql_query"
    description: str = "在公司資料庫執行唯讀 SQL"
    args_schema: type[BaseModel] = SqlQueryInput

    def __init__(self, db_conn, **kwargs):
        super().__init__(**kwargs)
        self._db = db_conn

    def _run(self, query: str) -> str:
        if not query.lower().startswith("select"):
            raise ValueError("只允許 SELECT")
        return str(self._db.execute(query).fetchall())

# 使用
tool = SqlQueryTool(db_conn=my_db)
```

## 設計原則

1. **description 寫清楚 when not to use** — LLM 常亂叫工具,明確寫「不適合:...」
2. **參數必要欄位要用型別** — LLM 會依型別自動驗證
3. **回傳純文字(或可 JSON 的 dict)** — 不要回 `datetime`、`numpy` 等難序列化的物件
4. **副作用寫進 description** — 「這會寄信給使用者」講清楚,HITL 才能攔截
5. **一個 tool 做一件事** — 不要 `do_stuff(action, x, y, z)`

## Tool 範例:公司內部客戶查詢

```python
from pydantic import BaseModel, Field
from langchain_core.tools import tool

class CustomerQuery(BaseModel):
    customer_id: str | None = Field(None, description="客戶 ID")
    email: str | None = Field(None, description="客戶 email")

@tool(args_schema=CustomerQuery)
def get_customer(customer_id: str | None = None, email: str | None = None) -> dict:
    """查詢客戶基本資料。必須至少給 customer_id 或 email 其中一個。

    回傳:{"id", "name", "email", "tier"}
    不可:取得信用卡號、密碼等敏感資料。
    """
    if not customer_id and not email:
        return {"error": "必須給 customer_id 或 email"}
    # ... 查 DB
    return {"id": "c_123", "name": "王小明", "email": "ming@example.com", "tier": "VIP"}
```

## 練習

- 寫一個 tool:輸入 GitHub repo URL,回傳最近 5 次 commit 的 title。
- 用 `@tool` + Pydantic,並加上 `handle_tool_error=True`。
- 測試:故意給壞的 URL,看 LLM 收到錯誤後會不會重試。
