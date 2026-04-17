---
sidebar_position: 3
title: 02. 開發環境與工具鏈
---

# 開發環境與工具鏈

課程支援兩種工作流程：**Arduino IDE 2.x**（GUI，適合教學）與 **arduino-cli**（CLI，適合自動化）。任選其一即可。

## A. Arduino IDE 2.x

### 1. 下載與安裝

至 [arduino.cc/en/software](https://www.arduino.cc/en/software) 下載對應作業系統的安裝檔。Windows / macOS / Linux 皆支援。

### 2. 加入 arduino-pico 開發板套件

`File → Preferences → Additional boards manager URLs` 加入：

```
https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json
```

接著 `Tools → Board → Boards Manager`，搜尋 **"Raspberry Pi Pico"**，安裝 **earlephilhower/arduino-pico**（不是 Arduino 官方版）。

### 3. 選擇開發板

`Tools → Board → Raspberry Pi RP2040 Boards → Raspberry Pi Pico 2 W`。

:::warning 選對版本
**Pico 2 W**（RP2350）與 **Pico W**（RP2040）是不同晶片，務必選對，否則編譯雖過但功能異常。
:::

### 4. 安裝必要函式庫

`Tools → Library Manager`，依序安裝：

| 函式庫 | 用途 |
| ---- | ---- |
| `Button2` | 按鈕多事件（短按／雙擊／長按） |
| `PubSubClient` | MQTT client |
| `ArduinoJson` | JSON 編解碼 |

`Wire`、`SPI`、`SD`、`WiFi`、`WebServer`、`EEPROM` 皆為 Arduino 核心內建，無須額外安裝。

## B. arduino-cli（推薦給 CI / 多人工作坊）

### 1. 安裝

Windows（PowerShell）：

```powershell
winget install ArduinoSA.CLI
```

macOS：

```bash
brew install arduino-cli
```

Linux：

```bash
curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh
```

### 2. 初始化與加入套件

```bash
arduino-cli config init
arduino-cli config add board_manager.additional_urls \
  https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json
arduino-cli core update-index
arduino-cli core install rp2040:rp2040
```

### 3. 安裝函式庫

```bash
arduino-cli lib install Button2 PubSubClient ArduinoJson
```

## 編譯與上傳指令

以 `CollectData` 草稿為例：

```bash
# 編譯
arduino-cli compile --fqbn rp2040:rp2040:pico_w CollectData/CollectData.ino

# 上傳（Windows 請換成實際 COM port，macOS/Linux 可能是 /dev/tty.usbmodemXXXX）
arduino-cli upload --fqbn rp2040:rp2040:pico_w --port COM6 CollectData/CollectData.ino
```

## 取得專案原始碼

```bash
git clone https://github.com/harry123180/AIforSensor-MPU6050.git
cd AIforSensor-MPU6050
```

每個子資料夾（`CollectData/`、`Inferencing/`、`MQTTwithAI/` ...）皆為獨立的 Arduino sketch，且附有 `README.md` 說明腳位與編譯指令。

## 序列埠監視設定

所有草稿皆使用 **115200 baud**，請於 Arduino IDE `Tools → Serial Monitor` 右下角選擇此波特率；arduino-cli 可用：

```bash
arduino-cli monitor -p COM6 -c baudrate=115200
```

## 下一步

進入 [第 03 章：周邊自測草稿](./03-peripheral-tests.md) 依序驗證 LED、按鈕、SD 卡、MPU6050 是否接線正確。
