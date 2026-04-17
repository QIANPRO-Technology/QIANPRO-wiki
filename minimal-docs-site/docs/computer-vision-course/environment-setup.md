---
id: environment-setup
title: 環境設定（新手入門）
sidebar_label: 環境設定
sidebar_position: 2
---

# 環境設定（新手入門）

> 適合完全沒有程式經驗的初學者。老手可以直接跳到 [快速安裝](#快速安裝指令)。

本課程在 Windows / macOS / Linux 皆可執行，以下以 **Windows** 為主要示範。

---

## 1. 安裝 Python

前往 [python.org](https://www.python.org/downloads/) 下載 **Python 3.10 或更新版本**。

:::warning 安裝時務必勾選「Add Python to PATH」
這樣才能在命令列中直接使用 `python` 指令。若不小心漏勾，重新執行安裝程式勾選即可。
:::

安裝完成後，開啟命令提示字元輸入：

```bash
python --version
```

看到 `Python 3.10.x` 之類版本號即代表成功。

---

## 2. 安裝 VSCode

前往 [code.visualstudio.com](https://code.visualstudio.com/) 下載並安裝 Visual Studio Code。

安裝後建議加裝官方 **Python** 擴充功能（左側擴充功能面板搜尋 `Python`）。

---

## 3. 開啟命令提示字元（CMD）

有兩種常用方式：

1. **從開始功能表搜尋「cmd」** — 最直接
2. **在資料夾中開啟** — 在檔案總管路徑欄輸入 `cmd`，會在當前資料夾開啟 CMD

---

## 4. 建立虛擬環境

虛擬環境可以隔離不同專案的套件，避免版本衝突。**每個 Python 專案都應該有自己的 venv。**

在專案資料夾中執行：

```bash
python -m venv .venv
```

`.venv` 是資料夾名稱慣例，也可以換成其他名字（但 `.gitignore` 通常已設定忽略 `.venv`）。

---

## 5. 啟動虛擬環境

### Windows

```bash
.venv\Scripts\activate
```

### macOS / Linux

```bash
source .venv/bin/activate
```

啟動成功後，命令列前方會出現 `(.venv)` 字樣。往後 `pip install` 都會裝進這個虛擬環境。

---

## 6. 安裝套件

### 安裝單一套件

```bash
pip install opencv-python
```

### 從 requirements.txt 批次安裝（推薦）

```bash
pip install -r requirements.txt
```

### 查看目前已安裝的套件

```bash
pip list
```

---

## 7. 在 VSCode 中選擇 Python 直譯器

按 `Ctrl + Shift + P` 開啟指令面板 → 輸入 `Python: Select Interpreter` → 選擇 `.venv` 資料夾中的 Python。

右下角會顯示目前選中的直譯器版本，確認是 `(.venv)` 即可。

---

## 快速安裝指令

若你已經熟悉 Python，複製下列指令一次裝好本課程所有依賴：

```bash
# clone repo
git clone https://github.com/harry123180/ComputerVisioncourse.git
cd ComputerVisioncourse

# 建立並啟動虛擬環境（Windows）
python -m venv .venv
.venv\Scripts\activate

# 安裝全部課程依賴
pip install -r requirements.txt
```

若只想跑單一天的內容，也可只裝該日需要的套件：

| 天 | 最少需要的套件 |
|----|----------------|
| DAY1 | `opencv-python`、`numpy`（加 `mediapipe` 跑 step07） |
| DAY2 | `opencv-python`、`mediapipe` |
| DAY3 | `ultralytics` |
| DAY4 | `opencv-python`、`numpy` |
| DAY5 | `customtkinter`、`opencv-python`、`pillow` |
| DAY6 | `customtkinter`、`ultralytics`、`opencv-python`、`pillow` |

---

## 常見問題

### Q1：輸入 `python` 顯示找不到指令？
安裝 Python 時沒有勾選「Add Python to PATH」。重新執行安裝程式、選「Modify」勾起來即可。

### Q2：`pip install` 卡在下載？
- 確認虛擬環境已啟動（前綴有 `(.venv)`）
- 升級 pip：`python -m pip install --upgrade pip`
- 國內使用者可改用鏡像：`pip install -i https://pypi.tuna.tsinghua.edu.cn/simple <套件>`

### Q3：VSCode 找不到 `.venv` 的 Python？
在 `.venv` 已建立的情況下，按 `Ctrl+Shift+P` → `Python: Select Interpreter` → 手動輸入 `.venv\Scripts\python.exe` 即可。

### Q4：執行腳本時出現中文編碼錯誤？
在檔案開頭加入 `# -*- coding: utf-8 -*-` 或確認檔案存成 UTF-8（VSCode 右下角可切）。

---

## 下一步

環境設定完成後，前往 [DAY1：OpenCV 入門](./day1-opencv-basics) 開始第一天的課程。
