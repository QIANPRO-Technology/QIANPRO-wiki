---
id: vllm-dgx-spark
title: 在 DGX Spark 上架 vLLM
sidebar_label: vLLM on DGX Spark
sidebar_position: 4
---

# 在 DGX Spark 上架 vLLM

本節示範如何在 **NVIDIA DGX Spark(GX10-A / GX10-B)** 雙卡工作站上部署 vLLM,提供 OpenAI 相容 API 給課程使用。

:::info
本節為千鉑科技內部教材,使用公司的 DGX Spark 環境。如果你沒有硬體,直接跳過用雲端 API 也能跟完全部課程。
:::

## 為什麼要用 vLLM?

- **OpenAI 相容** — 不用改程式碼,只換 `base_url`
- **吞吐量高** — PagedAttention + 連續批次處理
- **支援量化** — AWQ / GPTQ / FP8,塞得下更大的模型
- **工具呼叫** — 支援 tool_choice、structured output(Llama 3.1+)

## 硬體確認

DGX Spark 規格參考(請以 `/dgx-spark` skill 實際查詢為準):

| 規格 | GX10-A | GX10-B |
|------|--------|--------|
| GPU | 待填 | 待填 |
| VRAM | 待填 | 待填 |
| 介面 | NVLink / InfiniBand | - |

## 部署步驟(精簡版)

詳細的 SSH 連線、容器管理請用 `/dgx-spark` skill,這裡只列核心流程。

### 1. 連上 DGX Spark

```bash
# 在 Claude Code 用 skill
/dgx-spark
```

### 2. 拉 vLLM 官方 image

```bash
docker pull vllm/vllm-openai:latest
```

### 3. 啟動服務

範例:跑 Llama 3.3 70B Instruct,佔用兩張卡:

```bash
docker run -d --name vllm-llama33 \
  --gpus all \
  --ipc=host \
  -p 8000:8000 \
  -v /data/models:/models \
  -e HF_TOKEN=$HF_TOKEN \
  vllm/vllm-openai:latest \
  --model meta-llama/Llama-3.3-70B-Instruct \
  --tensor-parallel-size 2 \
  --max-model-len 32768 \
  --enable-auto-tool-choice \
  --tool-call-parser llama3_json
```

### 4. 驗證 API

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Llama-3.3-70B-Instruct",
    "messages": [{"role":"user","content":"Hi"}]
  }'
```

### 5. 在課程中使用

```python
from langchain.chat_models import init_chat_model

llm = init_chat_model(
    "meta-llama/Llama-3.3-70B-Instruct",
    model_provider="openai",
    base_url="http://dgx-spark:8000/v1",  # 或 Tailscale IP
    api_key="EMPTY",
)
```

## 建議模型(依用途)

| 用途 | 模型 | VRAM(FP16) | 備註 |
|------|------|-------------|------|
| 教學通用 | Llama 3.1 8B Instruct | ~16 GB | 入門示範 |
| Agent 工具呼叫 | Llama 3.3 70B Instruct | ~140 GB(兩卡) | 課程主力 |
| 長 context | Qwen 2.5 32B | ~64 GB | 128K context |
| 程式碼 | Qwen 2.5 Coder 32B | ~64 GB | SQL / 程式碼 Agent |
| 中文加強 | DeepSeek-V2.5 / Qwen2.5-72B | ~140 GB | 中文任務 |

## 開啟工具呼叫(Tool Use)

Llama 3.1+ 支援 OpenAI-compatible tool calling,但需要啟動參數:

```bash
--enable-auto-tool-choice
--tool-call-parser llama3_json
```

Qwen 2.5 則用:

```bash
--enable-auto-tool-choice
--tool-call-parser hermes
```

沒加這兩個旗標,工具呼叫不會運作,會變成純文字回應。

## 暴露到課程機器

建議用 Cloudflare Tunnel 或 Tailscale 把 `:8000` 穿透出來,避免開 public port。

- 詳細:用 `/cf-tunnel` skill
- 千鉑教室預設拓樸:`/network-topology` skill

## 效能觀察

用 LangSmith 追蹤 token 吞吐量、延遲。vLLM 本身也暴露:

```bash
curl http://localhost:8000/metrics
```

取得 Prometheus 格式的指標(TTFT、吞吐量、活躍請求數等)。

## 常見問題

| 症狀 | 解法 |
|------|------|
| OOM | 降 `--max-model-len` 或 `--gpu-memory-utilization 0.85` |
| 工具呼叫回純文字 | 忘了加 `--enable-auto-tool-choice` + `--tool-call-parser` |
| 非同步慢 | 檢查 `--max-num-seqs`(預設 256,低流量可降低) |
| HF 下載爆 IO | `--download-dir /data/models` 指到 NVMe |

## 下一步

- [開啟 LangSmith 追蹤](./langsmith)
- 進入 [Ch 03 LangChain 核心](../03-langchain-core/overview.md)
