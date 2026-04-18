---
id: llm-providers
title: LLM 供應商選擇
sidebar_label: LLM 供應商
sidebar_position: 2
---

# LLM 供應商選擇

本課程預設使用 **OpenAI 相容 API**(千鉑教室 Gateway),未來上線時可無痛切換到任何相容後端。

## 主流選擇

| 供應商 | 代表模型 | 強項 | 備註 |
|--------|----------|------|------|
| **千鉑教室 Gateway** | gemma4-31b, qwen3-14b | 教室內網、免費、符合課程節奏 | **課程預設** |
| **OpenAI** | gpt-4o, gpt-4o-mini, o1 | 工具呼叫穩定、生態完整 | 雲端選項 |
| **Anthropic** | Claude 3.5 Sonnet, Haiku | 長上下文、推理 | 需 `langchain-anthropic` |
| **Google** | Gemini 1.5 / 2.0 | 多模態、長 context | `langchain-google-genai` |
| **自架 OpenAI 相容後端** | 例 vLLM / Ollama / LM Studio | 資料不出門 | 本課程不涵蓋架設 |
| **Azure OpenAI** | 同 OpenAI | 企業合約、區域部署 | `langchain-openai` + Azure 端點 |

## LangChain 統一介面

無論是哪家供應商,`init_chat_model()` 可以一行切換:

```python
from langchain.chat_models import init_chat_model

# 千鉑教室 Gateway(課程預設)
llm = init_chat_model(
    "gemma4-31b",
    model_provider="openai",
    base_url="http://192.168.1.101:4000/v1",
    api_key="sk-你的-token",
    max_tokens=1024,
)

# OpenAI(未來上線切雲端)
llm = init_chat_model("gpt-4o-mini", model_provider="openai")

# Anthropic
llm = init_chat_model("claude-3-5-sonnet-latest", model_provider="anthropic")

# 使用方式完全一樣
resp = llm.invoke("你是誰?")
print(resp.content)
```

:::tip 切換不改業務邏輯
只改 `init_chat_model` 那一行,整支 Agent 程式都能無痛切換 — 這是 LangChain 最大的價值之一。
:::

## 如何選模型?

### 三個考慮點

1. **任務難度**
   - 簡單分類 / 摘要 → mini / haiku 級
   - 多步推理 / Agent → 旗艦級(4o, Sonnet)
   - 複雜規劃 / 數學 → o1 / o3 / reasoning model

2. **成本結構**
   - 高頻 + 短回應 → 地端(OpenAI 相容後端)
   - 低頻 + 長回應 → 雲端 pay-as-you-go

3. **資料敏感度**
   - 可外傳 → 雲端
   - 不可外傳 → 地端

### 成本對照(2025 參考)

| 模型 | 1M 輸入 | 1M 輸出 | 適合 |
|------|---------|---------|------|
| 千鉑 Gateway | 免費 | 免費 | 整個課程 |
| gpt-4o-mini | $0.15 | $0.60 | 開發、教學 |
| gpt-4o | $2.50 | $10.00 | 生產 Agent |
| claude-3-5-sonnet | $3.00 | $15.00 | 長 context、程式碼 |
| claude-3-5-haiku | $0.80 | $4.00 | 高頻分類 |

## 教學建議

| 課程階段 | 用什麼 |
|---------|--------|
| Ch 01-10 | 全程使用 **千鉑教室 Gateway**(`gemma4-31b` / `qwen3-14b`) |
| 學員自行延伸 | 依專案需求切換到雲端 API |

## 延伸

- 下一節:[課程 API Gateway](./course-api-gateway.md)
- LangChain 完整模型列表: [docs.langchain.com/oss/python/integrations/providers](https://docs.langchain.com/oss/python/integrations/providers/)
