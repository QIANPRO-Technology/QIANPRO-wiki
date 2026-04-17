---
id: course-api-gateway
title: 課程 API Gateway（學員專用）
sidebar_label: 課程 API Gateway
sidebar_position: 3
---

# 課程 API Gateway（學員專用）

本課程在千鉑教室內自架了一個 **LiteLLM Gateway**，學員拿老師發的 API token 就能直接調用本地 GPU 上的大型語言模型，不需要自己申請 OpenAI／Anthropic 帳號。

架構：

```
你的 Agent 程式
  │  （OpenAI 相容 SDK）
  ▼
http://<教室 IP>:4000/v1    ← LiteLLM Gateway
  │  · 驗證你的 token
  │  · 檢查額度 / 速率限制
  │  · 紀錄每次請求的 token 用量
  ▼
本地 Ollama（GX10-B, NVIDIA GB10）
  ├─ gemma4-31b
  └─ qwen3-14b
```

:::tip 為什麼要用 Gateway 而不是直接連 Ollama？
Gateway 幫你做三件事：**1) 認證**（課程結束 token 就失效）、**2) 計量**（每人有獨立額度）、**3) 中介**（未來切換雲端 API 不用改你的程式）。
這也是實際企業部署的常見架構。
:::

## 上課前你會拿到的東西

老師會發一張紙（或訊息）給你，上面有：

| 項目 | 範例值 |
|------|--------|
| **API Base URL** | `http://192.168.1.101:4000/v1` |
| **你的 API Key** | `sk-xxxxxxxxxxxxxxxxxxxxxxx` |
| **可用模型** | `gemma4-31b`、`qwen3-14b` |
| **額度** | 例：USD $5 / RPM 30 |
| **有效期** | 例：課程結束日 |

把 key **當密碼保護**，不要 commit 到 Git、不要貼到公開頻道。

## 第一次呼叫：Python OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-你的-token",
    base_url="http://192.168.1.101:4000/v1",
)

resp = client.chat.completions.create(
    model="gemma4-31b",
    messages=[
        {"role": "user", "content": "用一句話自我介紹"},
    ],
)
print(resp.choices[0].message.content)
```

## 整合到 LangChain（課程主力）

```python
from langchain.chat_models import init_chat_model

llm = init_chat_model(
    "gemma4-31b",                               # 模型名
    model_provider="openai",                    # LiteLLM 是 OpenAI 相容
    base_url="http://192.168.1.101:4000/v1",
    api_key="sk-你的-token",
)

print(llm.invoke("你是誰？").content)
```

切換成 `qwen3-14b` 只需改第一個參數，其他程式碼完全不動 —— 這是 LangChain 的統一介面。

## 整合到其他 Agent 框架

所有支援 OpenAI 相容 API 的框架都能用，只要改 `base_url` 和 `api_key`：

<details>
<summary>LlamaIndex</summary>

```python
from llama_index.llms.openai import OpenAI

llm = OpenAI(
    model="gemma4-31b",
    api_base="http://192.168.1.101:4000/v1",
    api_key="sk-你的-token",
)
```
</details>

<details>
<summary>CrewAI</summary>

```python
import os
os.environ["OPENAI_API_BASE"] = "http://192.168.1.101:4000/v1"
os.environ["OPENAI_API_KEY"] = "sk-你的-token"
os.environ["OPENAI_MODEL_NAME"] = "gemma4-31b"
```
</details>

<details>
<summary>AutoGen</summary>

```python
config_list = [{
    "model": "gemma4-31b",
    "base_url": "http://192.168.1.101:4000/v1",
    "api_key": "sk-你的-token",
}]
```
</details>

<details>
<summary>curl（快速驗證 / 除錯）</summary>

```bash
curl http://192.168.1.101:4000/v1/chat/completions \
  -H "Authorization: Bearer sk-你的-token" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma4-31b",
    "messages": [{"role":"user","content":"Hi"}]
  }'
```
</details>

## 模型怎麼選

| 模型 | 大小 | 強項 | 適用情境 |
|------|------|------|---------|
| `gemma4-31b` | 31B | 多模態、推理、繁中 | 課程主力；Agent 工具呼叫、RAG |
| `qwen3-14b` | 14B | 輕量、吞吐量高 | 高頻 / 平行呼叫多的實驗 |

Rule of thumb：**預設用 `gemma4-31b`**，做批次或並發實驗改 `qwen3-14b`。

## 查自己用了多少

### 方法 A：程式呼叫

```python
import requests

r = requests.get(
    "http://192.168.1.101:4000/key/info",
    headers={"Authorization": "Bearer sk-你的-token"},
)
info = r.json()["info"]
print(f"已花費: ${info['spend']:.4f} / ${info['max_budget']}")
print(f"可用模型: {info['models']}")
```

### 方法 B：回應裡看當次用量

每次 API 回應會帶 `usage` 欄位：

```json
{
  "choices": [...],
  "usage": {
    "prompt_tokens": 22,
    "completion_tokens": 60,
    "total_tokens": 82
  }
}
```

Python 取用：

```python
print(resp.usage.total_tokens)
```

## 常見錯誤

| HTTP / 訊息 | 原因 | 解法 |
|-------------|------|------|
| `401 Unauthorized` | Key 打錯、過期、被撤銷 | 跟老師要新的 |
| `403 Budget Exceeded` | 額度用完 | 跟老師申請加額度 |
| `429 Rate Limit` | 超過 RPM 限制 | 加 `time.sleep()`、改用 async 分散 |
| `400 model not found` | 模型名稱打錯 | 用 `GET /v1/models` 列出可用模型 |
| `Connection refused` | 不在教室網路、IP 錯 | 確認你跟 gateway 同個網段 |
| `Timeout` | 模型太大、Prompt 太長 | 降 `max_tokens` 或換小模型 |
| **`content` 是空字串、`finish_reason=length`** | 思考 token 把 `max_tokens` 用完了 | 把 `max_tokens` 調到 1024+（見 [Reasoning Mode](#reasoning-mode兩個模型都有) 章節）|

## 列出所有可用模型

```bash
curl http://192.168.1.101:4000/v1/models \
  -H "Authorization: Bearer sk-你的-token"
```

或 Python：

```python
models = client.models.list()
for m in models.data:
    print(m.id)
```

## 進階：Streaming 串流回應

把 Agent 做成 CLI / 聊天介面時很有用：

```python
stream = client.chat.completions.create(
    model="gemma4-31b",
    messages=[{"role": "user", "content": "說一個長故事"}],
    stream=True,
)
for chunk in stream:
    delta = chunk.choices[0].delta.content
    if delta:
        print(delta, end="", flush=True)
```

## Reasoning Mode（兩個模型都有！）

:::danger 最容易踩到的坑
`gemma4-31b` **和** `qwen3-14b` 預設都會先輸出 reasoning（思考過程）再給答案。如果你看到：
- `content` 是空字串 `""`
- `reasoning_content` 塞滿一堆文字
- `finish_reason` 是 `"length"`

就是 **思考 token 把 `max_tokens` 全用光，答案還沒生出來就被截斷了**。
:::

### 解法：把 `max_tokens` 開夠大（目前唯一可靠方式）

實測結果：就算只是問「你是誰？一句話」，gemma4-31b 也會用掉 200+ tokens 思考，剩幾十 token 才吐答案。

| 場景 | 建議 max_tokens |
|------|----------------|
| 簡單問答、分類 | **≥ 500** |
| Agent tool-calling | **≥ 1024** |
| 長回應、複雜推理 | **≥ 2048** |

```python
resp = client.chat.completions.create(
    model="gemma4-31b",
    messages=[...],
    max_tokens=1024,   # 預設太小，一定要調高
)
print(resp.choices[0].message.content)
```

### 不能用什麼（實測全部無效）

以下這些「關閉思考模式」的寫法在本 gateway 都**不生效**，LiteLLM / Ollama 不認：

```python
# ❌ 全都不工作（實測 2026-04-18）
extra_body={"reasoning": False}        # → 400 cannot unmarshal bool
extra_body={"think": False}             # → 靜默忽略，照樣 reasoning
extra_body={"reasoning_effort": "low"}  # → 靜默忽略
messages=[{"role":"user","content":"/no_think ..."}]  # qwen3 的前綴也不工作
```

### 取得 reasoning 過程（想看的話）

`reasoning_content` 欄位一定會有，可以印出來教學示範：

```python
msg = resp.choices[0].message
print("思考過程:", msg.reasoning_content)   # 或 msg.model_extra.get("reasoning_content")
print("最終答案:", msg.content)
```

## 切換到雲端 API（課程後半）

Gateway 的好處是 —— 未來你上線時要切 OpenAI 或 Anthropic，只改 `init_chat_model` 這一行，Agent 程式完全不動。詳見 [LLM 供應商選擇](./llm-providers)。

## 下一步

- 進一步了解 Gateway 背後的 vLLM / Ollama：[vLLM on DGX Spark](./vllm-dgx-spark)
- 設定觀測性與除錯：[LangSmith](./langsmith)
- 回到 [Ch 03 LangChain 核心](../03-langchain-core/overview.md)
