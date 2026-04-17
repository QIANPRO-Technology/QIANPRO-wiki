---
sidebar_position: 6
title: 05. Edge Impulse 模型訓練
---

# Edge Impulse 模型訓練

把 `Data/` 底下的 CSV 餵給 Edge Impulse Studio，完成一條完整的 **DSP → 類神經網路 → Arduino library 匯出** 鏈路。

## 1. 註冊與建立專案

1. 前往 [edgeimpulse.com](https://edgeimpulse.com/) 註冊免費帳號。
2. `+ Create new project` → 命名（例：`pico2w-imu`）→ 進入 Dashboard。
3. 左側選單 `Dashboard → Project info`，確認 target device 設為 **Raspberry Pi Pico 2 W**（若無此選項選 `Custom Cortex-M33` 亦可）。

## 2. 上傳資料

### 方法 A：網頁介面批次上傳

1. 左側 `Data acquisition → + Upload data`。
2. 選擇 `Upload existing data` → `Choose files` → 一次選 `Data/case0.sample*.csv` 全部檔案。
3. `Label`：選擇 `Infer from filename`（會自動抓 `case0` / `case1` 當作 label）。
4. `Category`：選 `Automatically split between training and testing`。
5. 重複上傳 case1、case2、case3 的檔案。

### 方法 B：用 CLI

```bash
npm install -g edge-impulse-cli
edge-impulse-uploader \
  --api-key ei_xxx \
  --label case0 \
  Data/case0.sample*.csv
```

:::tip CSV Header
Edge Impulse 預設 CSV 檔有欄位 header；本專案的 CSV **沒有 header**，三欄直接是 AccX / AccY / AccZ。上傳時若出錯，於 `Upload options → Frequency` 手動指定 1000 Hz、axis names `accX, accY, accZ`。
:::

## 3. 設計 Impulse

左側 `Impulse design → Create impulse`：

### Input block
- Window size: **1000 ms**
- Window increase: **500 ms**（訓練時 50% overlap）
- Frequency: **1000 Hz**

### Processing block
`Add a processing block → Spectral Analysis`：
- Filter: none 或 low-pass 50 Hz（視動作頻率）
- FFT length: 16
- 其他保留預設

### Learning block
`Add a learning block → Classification (Keras)`：
- 輸出 class 數量會自動對齊上傳的 label 數。

### Output features
會自動帶入 case0 / case1 / case2 / case3。按 **Save Impulse**。

## 4. 特徵生成

左側 `Spectral features → Generate features`。完成後右側 Feature Explorer 會以 3D 散點呈現不同 label 的分群狀況。

:::tip 判讀 Feature Explorer
不同類別的點雲若明顯分群，訓練一定會好；若嚴重重疊，代表動作特徵太像，回到 [資料擷取](./04-data-collection.md) 重新設計或補資料。
:::

## 5. 訓練模型

左側 `Classifier`：

| 參數 | 建議值 | 說明 |
| ---- | ---- | ---- |
| Training cycles | 30 – 100 | 小資料集不用太多 |
| Learning rate | 0.0005 | 預設即可 |
| Validation set size | 15% | |
| Neural network architecture | 2 × Dense(20) + Dense(10) | 預設已夠用 |

按 **Start training**，等待約 1 ~ 3 分鐘。Accuracy 建議 > 90%、Loss < 0.3。

## 6. 驗證（Model testing）

左側 `Model testing → Classify all`。看 Confusion matrix，每個 class 的 recall 應 > 85%。若某個 class 辨識率特別差，通常是：

- 該 case 樣本數偏少 → 補資料
- 該 case 動作與其他 case 太像 → 加大差異或合併 case
- Window size 太短 → 回 Impulse design 調整

## 7. 匯出 Arduino library

左側 `Deployment`：

1. Search box 輸入 `Arduino library` → 選該項。
2. `Engine` 選 `EON Compiler`（更省 flash，預設勾選）。
3. `Optimizations` 保持預設。
4. 按最下方 **Build** → 等 1–2 分鐘下載到 `ei-<project>-arduino-x.x.x.zip`。

## 8. 在本地 Arduino 匯入

### Arduino IDE 2.x

`Sketch → Include Library → Add .ZIP Library` → 選剛下載的 zip。

### arduino-cli

```bash
arduino-cli lib install --zip-path ./ei-pico2w-imu-arduino-1.0.0.zip
```

## 9. 對齊專案程式碼

`Inferencing/Inferencing.ino` 首行：

```cpp
#include <a20260414_inferencing.h>
```

請把 `a20260414_inferencing` 改成您 Edge Impulse 專案實際匯出的函式庫名稱（通常是 `<專案名>_inferencing.h`）。`MQTTwithAI/MQTTwithAI.ino` 同理。

## 下一步

把模型放到裝置上跑，看實際辨識效果 → [第 06 章：裝置端推論](./06-inference.md)。
