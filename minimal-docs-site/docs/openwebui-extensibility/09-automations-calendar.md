---
id: automations-calendar
title: Automations & Calendar（v0.9 新增）
sidebar_label: Automations & Calendar
sidebar_position: 9
---

# Automations & Calendar

**企業問答PoC v0.9 新增兩個相互關聯的擴充類別**：**排程自動化（Automations）** 與 **日曆工作區（Calendar）**。兩者讓 AI 從「被動問答」進化到「主動定期執行任務」。

---

## Automations（排程自動化）

### 概念

使用者可在對話中指示 AI **定期自動跑一段 chat**，例如：

- 每天早上 8 點產生昨日生產數據摘要
- 每週一發出週報
- 每小時抓一次設備狀態並在異常時通知

建立後，AI 會按照排程自動在後台執行，結果出現在對話歷史或觸發 webhook。

### 啟用

在 `.env` 或 docker run `-e` 中設定：

```bash
ENABLE_AUTOMATIONS=true
```

重啟後，管理員控制台出現 **Automations** 頁面；對話中啟用對應 tool 後 LLM 可直接建立排程。

### 管理員限額設定

防止使用者建立過多排程導致伺服器過載：

| 環境變數 | 說明 | 範例 |
|---|---|---|
| `AUTOMATION_MAX_COUNT` | 每位非管理員最多幾條排程 | `5` |
| `AUTOMATION_MIN_INTERVAL` | 兩次排程最短間隔（秒） | `3600`（每小時最多一次） |
| `SCHEDULER_POLL_INTERVAL` | 後台 scheduler 輪詢間隔（秒） | `60` |

### Automation Tools（LLM 可呼叫的工具）

若對話中啟用 Automation Tools，LLM 可直接用 function calling 操作排程：

| Tool | 說明 |
|---|---|
| `create_automation` | 建立新排程（指定 cron 表達式、任務描述） |
| `list_automations` | 列出目前所有排程及狀態 |
| `update_automation` | 修改現有排程（時間、暫停 / 恢復） |
| `delete_automation` | 刪除排程 |
| `run_automation` | 立即手動觸發一次排程（不等下次時間） |

:::info
`create_automation` 在 v0.9.0 移除了 `model_id` 參數，一律使用當前對話的模型執行排程任務。
:::

### 使用範例

在對話中告訴 AI：

> 「幫我設一個每天早上 7 點的排程，自動問『昨日生產報告』並把結果 POST 到 https://webhook.internal/daily-report」

LLM 會呼叫 `create_automation` 並填入對應參數。

---

## Calendar（日曆工作區）

### 概念

v0.9 加入**日曆工作區**，提供：

- 建立 / 管理事件（一次性 + 週期性）
- 設定提前提醒（in-app toast、瀏覽器通知、webhook）
- 在側欄日曆中同時顯示**排程自動化**與**日曆事件**

### 啟用

```bash
ENABLE_CALENDAR=true
```

重啟後側欄出現 **Calendar** 入口（可釘選到側欄方便存取）。

### 提醒設定

| 環境變數 | 說明 |
|---|---|
| `CALENDAR_ALERT_LOOKAHEAD_MINUTES` | 提前幾分鐘推送提醒（預設 15） |

提醒推送方式：
- **in-app toast**：企業問答PoC 介面右下角彈出
- **瀏覽器通知**：需使用者授權
- **Webhook**：可設定 URL，事件到期前觸發 HTTP POST

### RBAC 權限控制

管理員可限制哪些角色能使用 Calendar：

```bash
USER_PERMISSIONS_FEATURES_CALENDAR=true   # 允許一般使用者使用
```

在 **管理員設定 → 使用者** 裡也可針對個別角色調整。

### Calendar Builtin Tools（4 個內建 tool）

啟用 Calendar 後，LLM 可呼叫這些工具：

| Tool | 說明 |
|---|---|
| `create_event` | 建立日曆事件（標題、時間、描述、提醒） |
| `list_events` | 查詢指定時間範圍的事件 |
| `update_event` | 修改現有事件 |
| `delete_event` | 刪除事件 |

### 注意：Scheduled Tasks 是 Virtual Calendar

v0.9 起，**Scheduled Tasks（排程任務）是 virtual calendar 項目，不存進 Calendar DB 表格**。它們只在 UI 裡顯示在日曆中，但資料是從 automation 表動態計算出來的。

---

## Automations vs Calendar：何時用哪個？

| 需求 | 用途 |
|---|---|
| AI 定期自動產生內容 / 送出報告 | **Automations** |
| 記錄重要日期 / 行程 / 會議 | **Calendar** |
| 事件快到前收到通知 | **Calendar 提醒** |
| 把排程任務跟行程一起看 | **Calendar（Automations 在 virtual Calendar 顯示）** |

---

## 快速啟用 Checklist

```bash
# docker run 加入：
-e ENABLE_AUTOMATIONS=true
-e ENABLE_CALENDAR=true
-e AUTOMATION_MAX_COUNT=5
-e AUTOMATION_MIN_INTERVAL=3600
-e CALENDAR_ALERT_LOOKAHEAD_MINUTES=15
```

1. 重啟容器
2. 管理員控制台確認 Automations / Calendar 頁面出現
3. 在 Workspace → Models → 編輯模型 → 啟用 Automation Tools / Calendar Tools
4. 對話中確認 LLM 可呼叫相關 tool
