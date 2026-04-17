---
sidebar_position: 4
title: 03. 周邊自測草稿
---

# 周邊自測草稿

正式進入資料擷取之前，先用 5 份獨立的小草稿確認每個周邊各自運作正常。遇到問題也可回來這章單獨排查。

## 1. RGBLEDCode — LED 點亮

**目的**：驗證 GP0 / GP1 / GP2 的 RGB LED 接線正確。

### 程式重點（`RGBLEDCode/RGBLEDCode.ino`）

```cpp
#define R 0
#define G 1
#define B 2

void setup() {
  Serial.begin(115200);
  pinMode(R, OUTPUT);
  pinMode(G, OUTPUT);
  pinMode(B, OUTPUT);
}

void loop() {
  digitalWrite(R, 1); delay(100); digitalWrite(R, 0); delay(100);
  digitalWrite(G, 1); delay(100); digitalWrite(G, 0); delay(100);
  digitalWrite(B, 1); delay(100); digitalWrite(B, 0); delay(100);
}
```

### 預期現象

紅 → 綠 → 藍依序閃爍，循環不停。

:::warning 共陰 vs 共陽
本課程預設 **共陰極** 模組（HIGH 點亮）。若您的 LED 是共陽極，將 `digitalWrite(R, 1)` 與 `0` 對調即可。
:::

## 2. BTNCode — 按鈕多事件

**目的**：驗證 GP4 / GP5 按鈕接線與 `Button2` 的短按／雙擊／三擊／長按事件判斷。

### 相依函式庫

```bash
arduino-cli lib install Button2
```

### 預期序列埠輸出

```
Button2 Multi-Function Example
================================
Ready! Press buttons to test:
- Single click
- Double click
- Triple click
- Long press (hold > 1 second)
================================
BTN1: Single Click
BTN2: Long Press Detected
```

若按了沒反應，**先檢查按鈕另一端是否接到 GND**。`Button2` 預設啟用內部上拉，不需要外接 10 kΩ。

## 3. SDCardWrite — SD 卡讀寫

**目的**：驗證 GP9-GP12 的 SPI1 介面與 SD 卡格式化正確。

### 程式邏輯

1. `SPI1.setTX(11)` / `setSCK(10)` / `setRX(12)` 設定自訂 SPI 腳位。
2. `SD.begin(CS_PIN, SPI1)` 初始化（CS 為 GP9）。
3. 開 `hello.txt` 寫入 `"hello world"`，再讀回印到序列埠。

### 預期輸出

```
初始化SD卡...
SD卡初始化成功
檔案寫入完成
檔案內容:
hello world
```

:::danger SD 卡格式
必須是 **FAT16 或 FAT32**。exFAT、NTFS 會初始化失敗。容量建議 2 GB – 32 GB，過大的卡相容性較差。
:::

## 4. MPU6050Code — 三軸加速度

**目的**：驗證 I2C1（GP14 / GP15）與 MPU6050 通訊，並確認 1 kHz 取樣。

### 初始化要點

```cpp
Wire1.setSDA(14);
Wire1.setSCL(15);
Wire1.begin();
Wire1.setClock(400000);        // 400 kHz

writeRegister(0x6B, 0x00);     // 喚醒
writeRegister(0x1C, 0x00);     // ±2g
writeRegister(0x1B, 0x00);     // ±250°/s
writeRegister(0x19, 0x00);     // 1 kHz 取樣
writeRegister(0x1A, 0x00);     // 關閉 DLPF 以獲得最大頻寬
```

### 預期輸出

```
MPU6050 Accelerometer Test
MPU6050 initialized successfully!
±2g range, 1kHz sampling
AccelX,AccelY,AccelZ
-0.032,0.015,0.998
-0.031,0.016,0.997
...
```

靜止平放時，**Z 軸應接近 1.0 g**、X / Y 軸接近 0。若三軸全為 0 或 `-8.000`，通常是沒喚醒或 I2C 位址錯誤。

:::tip 觀察訊號
把輸出餵給 Arduino IDE 的「**序列埠繪圖家**（Serial Plotter）」，拿起板子晃動即可即時看到三軸波形。
:::

## 5. example — 起手式

**目的**：把按鈕與 RGB LED 串在一起，作為新學員的第一份完整草稿。

**行為**：按一次 BTN1，依序點亮 紅 2 秒 → 綠 2 秒 → 藍 2 秒。

適合當成接線完成的綜合驗收。測過這份，下一章 `CollectData` 就能直接跑。

## 自測通過檢查表

- [ ] RGB LED 三色皆可獨立點亮
- [ ] BTN1 / BTN2 短按、雙擊、長按皆有序列埠訊息
- [ ] SD 卡可寫入並讀回 `hello.txt`
- [ ] MPU6050 靜止時 Z ≈ 1 g、搖動時三軸有明顯變化
- [ ] example 按下 BTN1 能看到 R → G → B 依序點亮

全部打勾後，進入 [第 04 章：資料擷取](./04-data-collection.md)。
