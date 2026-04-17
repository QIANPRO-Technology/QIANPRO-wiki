---
id: day5-customtkinter-gui
title: DAY5 — CustomTkinter GUI
sidebar_label: DAY5 CustomTkinter GUI
sidebar_position: 7
---

# DAY5：CustomTkinter GUI 示範

> **主題**：將 OpenCV 處理流程包裝成圖形化介面
> **對應 Repo 資料夾**：[`DAY5/`](https://github.com/harry123180/ComputerVisioncourse/tree/main/DAY5)

## 學習目標

1. 建立基本的 CustomTkinter 視窗、按鈕與狀態列
2. 透過 `filedialog` 讓使用者選擇本機圖片
3. 掌握 **OpenCV BGR → PIL RGB → Tk PhotoImage** 的轉換關鍵
4. 以物件導向（`class AppName(ctk.CTk)`）方式組織 GUI 程式
5. 以 DAY1 學過的處理（灰階、模糊、邊緣）作為按鈕功能，串成 Demo

## 先備知識

- DAY1 的影像處理（灰階、高斯模糊、Canny）
- Python Class 基礎語法（`__init__`、`self`）

---

## 腳本

| 檔案 | 功能 |
|------|------|
| `inspection_dashboard.py` | 主程式 |
| `PRD.md` | 產品需求文件（參考用） |
| `TODOLIST.md` | 待辦事項（參考用） |

---

## 環境準備

```bash
pip install customtkinter opencv-python pillow
python inspection_dashboard.py
```

---

## 核心概念：影像在三種庫之間如何流動

GUI 顯示影像最容易卡住的關鍵是 **格式轉換**：

```mermaid
flowchart LR
    A[檔案 JPG] -- cv2.imread --> B[OpenCV BGR]
    B -- cvtColor BGR2RGB --> C[OpenCV RGB]
    C -- Image.fromarray --> D[PIL Image]
    D -- ImageTk.PhotoImage --> E[Tk 可顯示]
```

### 最常見的三大坑

| 坑 | 現象 | 解法 |
|----|------|------|
| 忘了 BGR → RGB | 色彩反轉（藍臉） | 先 `cv2.cvtColor(frame, COLOR_BGR2RGB)` |
| 忘了保留 `photo` 參考 | 圖片顯示後立刻消失 | 做 `self.preview.image = photo` 避免 GC |
| 灰階直接丟 PIL | PIL 預期三通道 | 先 `cv2.cvtColor(frame, COLOR_GRAY2RGB)` |

---

## 程式結構

```python
class InspectionApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        # 1. 設定視窗
        # 2. 建左側預覽區 self.preview
        # 3. 建右側按鈕區 + 狀態列

    def load_image(self): ...       # 載入圖片 + update_preview
    def apply_grayscale(self): ...  # 灰階
    def apply_blur(self): ...       # 高斯模糊
    def apply_edges(self): ...      # Canny
    def update_preview(self, frame): ...  # 共用顯示邏輯
```

**設計重點**：

- `self.current_frame` 保存目前畫面，讓所有處理按鈕都能接力套用
- 每個處理按鈕 → 呼叫 OpenCV → 呼叫共用 `update_preview()`，避免重複程式碼
- 狀態列 `self.status` 即時顯示當前操作，對教學示範很有幫助

---

## 功能說明

| 功能 | 說明 |
|------|------|
| 載入圖片 | 從檔案系統選擇圖片 |
| 灰階處理 | 將影像轉換為灰階 |
| 模糊處理 | 套用高斯模糊 |
| 邊緣偵測 | 使用 Canny 演算法 |

---

## 教學提示

1. 先向學員介紹每個按鈕背後對應的處理函式
2. 狀態欄會顯示當前操作，便於同步說明流程
3. 可延伸加入 YOLO 推論或 CSV 報表輸出，作為專題進階任務

---

## 常見問題

### Q1：`customtkinter` 安裝失敗？
- Python 需 ≥ 3.10；低版本改用 `customtkinter==5.1.3`
- Linux 需額外安裝 `tk`：`sudo apt install python3-tk`

### Q2：載入圖片後畫面消失？
少了 `self.preview.image = photo` 這行，`photo` 變數被 GC 回收，圖就不見了。

### Q3：中文檔名無法載入？
`cv2.imread()` 不支援中文路徑，改用：

```python
import numpy as np
image = cv2.imdecode(np.fromfile(path, np.uint8), cv2.IMREAD_COLOR)
```

### Q4：按鈕點了沒反應？
通常是 `self.current_frame is None`，請先載入圖片。處理按鈕已有 `messagebox` 提醒。

---

## 延伸建議

- 參考 `PRD.md` 了解完整產品需求規劃
- 參考 `TODOLIST.md` 了解可擴充的功能項目
- 結合 [DAY6](./day6-smart-inspection) 的 YOLO 整合範例，打造完整檢測應用
- 加入「存檔」按鈕：
  ```python
  cv2.imwrite(f"output_{timestamp}.png", self.current_frame)
  ```
- 加入「重設」按鈕：回到原圖
- 用 `CTkSlider` 讓 Canny 閾值可即時調整

**下一站**：[DAY6 — 智慧視覺檢測整合](./day6-smart-inspection)
