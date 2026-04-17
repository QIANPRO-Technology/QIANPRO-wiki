---
id: use-cases
title: Agent 使用情境
sidebar_label: 使用情境
sidebar_position: 2
---

# Agent 使用情境與反模式

## 七個真實世界 Use Case

| 類型 | 範例 | 關鍵 |
|------|------|------|
| **研究助理** | 給主題後自動搜尋、整理、附引用 | 工具呼叫 + RAG |
| **客服自動化** | 判斷問題、查 KB、回覆或轉真人 | HITL + 長期記憶 |
| **SQL Agent** | 自然語言問資料庫 | Tool 呼叫 + schema 理解 |
| **工作流自動化** | 讀 email → 開單 → 通知 | 多工具鏈、Observability |
| **個人助理** | 安排行程、追蹤待辦 | 長期記憶、多 Agent |
| **程式碼助手** | 讀 repo、改 bug、開 PR | Code interpreter、檔案系統 |
| **瀏覽器代操** | 訂票、爬資料 | Browser tool、截圖 |

## Agent 設計的三個維度

Microsoft 課程提出的設計原則:

- **Space(空間)** — 連結人與知識,存在感要「剛好」
- **Time(時間)** — 記得過去、輔助當下、預備未來
- **Core(核心)** — 擁抱不確定性,但透過透明與使用者控制建立信任

## 常見反模式

:::danger 不要把所有事都丟給 Agent
「Agent-washing」是最常見錯誤:
- 能用 SQL 查的就別用 Agent
- 能用 `if/else` 解的就別用 LLM
- 能用一次 prompt 解的就別做 multi-step
:::

### 何時 **不該** 用 Agent

| 情境 | 改用 |
|------|------|
| 結果必須 100% 正確、可審計 | 規則引擎 / SQL |
| 高頻、低延遲 | 快取 + 小模型 |
| 無狀態的一問一答 | 一般 ChatBot + RAG |
| 工作流已固定 | 傳統 pipeline + LLM 只做單點 |

## Agent 的失敗模式

- **無限迴圈**:Agent 一直呼叫同一個工具拿不到結果
- **Prompt injection**:工具回傳的內容改寫了 Agent 行為
- **Hallucinated tool**:Agent 呼叫不存在的工具或參數
- **Context 爆炸**:對話過長,token 成本失控

這些問題在後面章節會一一處理:
- 迴圈 → [Ch 05 LangGraph 狀態](../05-langgraph-intro/why-graph.md) + max_steps
- Injection → [Ch 10 Guardrails](../10-production/observability.md)
- Hallucinated tool → [Ch 04 Tool 設計](../04-tools/tool-concept.md)
- Context 爆炸 → [Ch 06 記憶管理](../06-memory/short-term.md)

## 討論題

1. 你所在的公司有沒有看過「用 Agent 做了本不該用 Agent 的事」?
2. 在上面七個 use case 中,哪個你覺得最適合用 vLLM 本地部署?為什麼?
