---
id: day3-yolo-finetune
title: DAY3 — YOLO11 微調與推論
sidebar_label: DAY3 YOLO11 微調
sidebar_position: 5
---

# DAY3：YOLO11 微調與推論

> **主題**：使用 Ultralytics YOLO11 進行資料集微調與推論
> **對應 Repo 資料夾**：[`DAY3/`](https://github.com/harry123180/ComputerVisioncourse/tree/main/DAY3)

## 學習目標

1. 理解 YOLO 目標偵測概念：**邊界框** + **類別** + **信心度**
2. 讀懂 Ultralytics 資料集格式（`data.yaml` + YOLO 標註）
3. 執行 **下載預訓練權重 → 微調 → 驗證 → 推論** 的完整流程
4. 解讀訓練輸出的關鍵 metrics（mAP、precision、recall）
5. 把訓練好的權重交給 [DAY6 GUI](./day6-smart-inspection) 進行產線應用

## 先備知識

- DAY1 的 OpenCV 基本操作
- Python 環境管理（虛擬環境、`pip`）
- 有 GPU 建議先裝對應 CUDA 版本的 PyTorch

---

## 腳本一覽

| 檔案 | 功能 |
|------|------|
| `download_weights.py` | 下載 YOLO11n 預訓練權重到 `models/` |
| `train_yolo.py` | 使用 `dataset/extracted/data.yaml` 訓練 |
| `infer_image.py` | 讀 `best.pt` 對驗證集圖片推論 |

---

## 核心概念

### YOLO 是什麼？

YOLO（**Y**ou **O**nly **L**ook **O**nce）是即時目標偵測模型家族，對整張圖做一次 forward 同時預測邊界框與類別。

**YOLO11**（Ultralytics 2024）共有 n / s / m / l / x 五種尺寸。本課程用最小的 `yolo11n`（nano），CPU 也能訓練。

### 資料集格式

Ultralytics 用 `data.yaml` 描述資料集：

```yaml
train: train/images      # 訓練圖片路徑
val:   valid/images      # 驗證圖片路徑
test:  test/images
nc: 4                    # 類別數
names: ['1', '5', '10', '50']  # 類別名稱（硬幣面額）
```

每張圖對應一個同名 `.txt`，每一行是一個框：

```
<class_id> <cx> <cy> <w> <h>
```

**重點**：`cx, cy, w, h` 皆為 **歸一化 (0~1)** 的相對座標。

---

## 環境準備

```bash
pip install ultralytics
```

GPU 訓練請依 [PyTorch 官網](https://pytorch.org/get-started/locally/) 安裝對應 CUDA 版本。

---

## 推薦流程

### Step 1：下載預訓練權重

```bash
python download_weights.py
```

會在 `models/` 產生 `yolo11n.pt`（約 5MB）。

### Step 2：訓練模型

```bash
python train_yolo.py
```

**預設設定**：

| 參數 | 值 | 意義 |
|------|------|------|
| `epochs` | 20 | 完整跑過訓練集的次數 |
| `imgsz` | 640 | 訓練時圖片縮放到的大小 |
| `project` | `runs/` | 結果輸出資料夾 |
| `name` | `demo_yolo11` | 本次訓練名稱 |

訓練輸出會放在 `runs/demo_yolo11/`：

```
runs/demo_yolo11/
├── weights/
│   ├── best.pt     ← 驗證集最佳模型（推薦使用）
│   └── last.pt     ← 最後一 epoch
├── results.png     ← 訓練曲線
├── confusion_matrix.png
└── val_batch*.jpg  ← 驗證集推論範例
```

### Step 3：執行推論

```bash
python infer_image.py
```

預設讀 `runs/demo_yolo11/weights/best.pt`，對驗證集第一張圖片推論，結果輸出到 `runs/demo_predict/`。

---

## Metrics 解讀

訓練結束會印出一張表，重點欄位：

| 指標 | 意義 | 合理區間 |
|------|------|----------|
| `P` (Precision) | 預測為正確的有多少真的正確 | > 0.8 |
| `R` (Recall) | 真實目標有多少被抓到 | > 0.8 |
| `mAP50` | IoU ≥ 0.5 時的平均精度 | > 0.7 |
| `mAP50-95` | IoU 從 0.5 到 0.95 平均 | > 0.5（難度高） |

:::warning 20 epochs 只是示範
課堂 20 epochs 用來讓學員看到收斂過程；**真正產線應用至少 100 epochs 起跳**。
:::

---

## 常見問題

### Q1：`CUDA out of memory`？
- 在 `model.train(...)` 加入 `batch=8`（或更小）
- 改用 `imgsz=416` 降低圖片大小

### Q2：訓練非常慢？
- 確認是否用到 GPU：
  ```python
  import torch; print(torch.cuda.is_available())
  ```
- 沒 GPU 請減少 `epochs` 或改用更小資料集

### Q3：`find data.yaml error`？
- 一定要先把 `yolo_coin_dataset.zip` 解壓到 `dataset/extracted/`
- `data.yaml` 內的路徑必須 **相對於 `data.yaml` 本身**

### Q4：推論沒任何框？
- 降低信心度門檻：`model.predict(source=..., conf=0.1)`
- 可能訓練還沒收斂，再跑幾個 epochs

---

## 延伸任務

- 換成你自己的資料集（用 [Roboflow](https://roboflow.com/) 標註後匯出 YOLO 格式）
- 試 `yolo11s`、`yolo11m` 比較速度與精度
- 把 `runs/demo_yolo11/weights/best.pt` 丟給 [DAY6 GUI](./day6-smart-inspection)
- 寫 `infer_video.py` 處理整段影片並輸出帶框結果

**下一站**：[DAY4 — 高解析影像處理](./day4-high-res-image)
