---
id: pipelines
title: Pipelines（獨立 worker 服務）
sidebar_label: Pipelines
sidebar_position: 7
---

# Pipelines（獨立 worker）

**企業問答PoC 具有外部 worker 擴充特性** —— Pipelines 讓你把複雜、重運算的邏輯丟到**獨立 Docker 容器**執行，企業問答PoC 主站只當入口。不要跟 [Pipe Functions](./pipe-functions) 搞混：

- **Pipe Function** = 跑在企業問答PoC 容器**內**的 Python 檔
- **Pipelines** = 跑在**獨立 Docker** 的 Python 服務（預設 port 9099），企業問答PoC 呼叫它

---

## 什麼時候需要 Pipelines

當你有**重運算任務** —— 主站跟它綁在同進程會被拖慢或 OOM：

- 本地跑大模型推論（vLLM、llama.cpp、TGI）
- 複雜多步 RAG（檢索 + rerank + 多次 LLM 呼叫）
- 要裝很多特殊 Python 套件（不想把主站 image 弄肥）
- 要獨立 scale（主站 2 replicas，推論 server 6 GPU replicas）

**一般供應商接線、基本過濾、中等邏輯 → 用 Pipe Function** 比較輕；Pipelines 是「大炮打小鳥」。

---

## 部署

### Docker 方式（推薦）

```bash
docker run -d -p 9099:9099 \
  --add-host=host.docker.internal:host-gateway \
  -v pipelines:/app/pipelines \
  --name pipelines \
  --restart always \
  ghcr.io/open-webui/pipelines:main
```

**關鍵設定**：

| 項目 | 值 |
|---|---|
| Port | `9099` |
| 預設 API Key | `0p3n-w3bu!`（**正式環境要換**） |
| Volume | `/app/pipelines` — Pipeline Python 檔放這 |

### 手動方式（非 Docker）

需要 Python 3.11（**嚴格限定 3.11**，其他版本官方不保證）：

```bash
git clone https://github.com/open-webui/pipelines
cd pipelines
pip install -r requirements.txt
./start.sh
```

環境變數：`PIPELINES_DIR` 可改 pipeline 資料夾位置。

---

## 連接 OpenWebUI

1. **管理員 → 設定 → 連線**（Connections）
2. 點 `+` 新增
3. **API URL**：`http://localhost:9099`（或同網路的 IP/host）
4. **API Key**：`0p3n-w3bu!`（或你改的）
5. 按 Verify，看到 **Pipelines** icon 出現即成功
6. 然後在 **設定 → Pipelines** 管理 pipeline 檔

---

## Pipeline 檔案結構

放在 `/app/pipelines/<name>.py`（或 volume mount 的路徑）。啟動時自動掃描載入。

官方沒給完整 class 模板（看 [examples](https://github.com/open-webui/pipelines/blob/main/examples)）。常見模式：

- `class Pipeline` — 主類別
- 支援兩種子類：**Filter**（前處理/後處理）與 **Pipe**（模型供應商）
- 透過 `valves` 暴露可調參數 → OpenWebUI 端 UI 生成表單
- 對 OpenWebUI 而言它只是一個 **OpenAI-compatible endpoint**，所以任何符合這格式的外部服務都能當 Pipeline 上

---

## 對照：Pipe Function vs Pipelines

| 面向 | [Pipe Function](./pipe-functions) | Pipelines |
|---|---|---|
| 部署 | OpenWebUI 容器內 `.py` | 獨立 Docker 服務 |
| 設定 | 管理員控制台 → Functions | 設定 → 連線（新增 Pipeline 服務） |
| 安裝相依 | 主站 `requirements:` docstring | 各 Pipeline 容器自己管 |
| Scale | 跟主站一起 | 獨立 scale（可 K8s） |
| GPU 存取 | 共用主站 resource | 獨立分配、可指定 GPU |
| 適合 | 新 provider、中等邏輯、filter | 重運算 / 大 RAG / 客製 runtime |
| 設置複雜度 | 低（貼 Python 就好） | 中（多管一個服務） |

---

## 常見應用範例

官方 examples repo 有現成的：

- **Function Calling Pipeline** — 自製 function-call orchestrator
- **Custom RAG Pipeline** — 專屬的 retrieval-augmented workflow
- **Langfuse 監控** — 對話流轉送到 Langfuse 做 observability
- **Rate Limit Filter** — 節流
- **LibreTranslate 即時翻譯** — 所有訊息轉譯
- **Toxic Message Filter** — 內容審查
- 自製 Agent、家庭自動化 API、專用 Python lib 整合

---

## 安全性

> A malicious Pipeline could access your file system, exfiltrate data, mine cryptocurrency, or compromise your system.

Pipeline 跑任意 Python。**只安裝審過的 source**，尤其注意：

- 正式環境 API key `0p3n-w3bu!` 必改
- Pipeline 容器別暴露到公網
- 權限原則（least privilege）：只給它需要的 volume / network

---

## 參考

- Pipelines repo：[github.com/open-webui/pipelines](https://github.com/open-webui/pipelines)
- 範例程式：[github.com/open-webui/pipelines/tree/main/examples](https://github.com/open-webui/pipelines/tree/main/examples)
