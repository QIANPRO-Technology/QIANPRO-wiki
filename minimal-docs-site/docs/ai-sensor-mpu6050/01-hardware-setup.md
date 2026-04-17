---
sidebar_position: 2
title: 01. 硬體與接線
---

# 硬體與接線

## 腳位總表

| 訊號 | Pico 2 W GPIO | 備註 |
| ---- | ------------- | ---- |
| RGB LED R | GP0 | 紅色，串聯 330 Ω |
| RGB LED G | GP1 | 綠色，串聯 330 Ω |
| RGB LED B | GP2 | 藍色，串聯 330 Ω |
| BTN1（錄製） | GP4 | 另一端接 GND |
| BTN2（模式） | GP5 | 另一端接 GND |
| SD Card CS | GP9 | SPI1 |
| SD Card SCK | GP10 | SPI1 |
| SD Card MOSI | GP11 | SPI1 |
| SD Card MISO | GP12 | SPI1 |
| MPU6050 SDA | GP14 | I2C1 |
| MPU6050 SCL | GP15 | I2C1 |
| VCC | 3V3 OUT | 3.3V 共軌 |
| GND | GND | 共地 |

## ASCII 接線示意

```
+------------------------------+        +-----------------------+
| Raspberry Pi Pico 2 W        |        | Sensor / Peripheral   |
|                              | GP0  ->| RGB LED R (紅)        |
| USB 5V/3V3/GND --- 共用地線  | GP1  ->| RGB LED G (綠)        |
|                              | GP2  ->| RGB LED B (藍)        |
|                              | GP4  ->| BTN1 錄製按鈕         |
|                              | GP5  ->| BTN2 模式按鈕         |
|                              | GP9  ->| SD Card CS            |
|                              | GP10 ->| SD Card SCK           |
|                              | GP11 ->| SD Card MOSI          |
|                              | GP12 ->| SD Card MISO          |
|                              | GP14 ->| MPU6050 SDA (I2C1)    |
|                              | GP15 ->| MPU6050 SCL (I2C1)    |
+------------------------------+        +-----------------------+
```

## 教學板 PCB

專案提供完整 PCB 設計檔與 schematic：

- `PCB/AI_project_Gerber.zip` — 送 JLCPCB / PCBWay 即可打樣。
- `PCB/AI培育計畫線路原理圖.pdf` — 完整線路圖。
- `PCB/PCB_Front_Layout.jpg` / `PCB_Back_Layout.jpg` — 佈線預覽。

**建議規格**：FR-4、厚度 1.6 mm、最小線寬/孔距 0.2/0.3 mm、表面 HASL 即可。

:::tip PCB vs 麵包板
初次教學建議用 PCB，接線固定、不易掉線。學員自修版可用麵包板練習排線判讀。
:::

## 初次上電檢查

1. **未接 USB 前**：檢查 3V3 與 GND 沒有短路（萬用電表量電阻 > 1 kΩ）。
2. **接 USB 後**：Pico 板載 LED 亮起，PC 出現 `Board CDC` 序列埠。
3. **MPU6050 指示燈**：GY-521 模組板載 LED 應長亮。
4. **SD 卡燈號**：讀卡模組上電後應有 LED 亮起（部分模組無 LED，可跳過）。

:::warning 電源注意
MPU6050 請務必接 3V3，**絕對不要接 5V**，否則會燒毀晶片。
SD 卡模組依型號不同，部分需要 5V 供電 + 內建電平轉換，採購時請確認。
:::

## 下一步

硬體接線完成後，進入 [第 02 章：開發環境與工具鏈](./02-environment.md) 安裝 Arduino IDE 與必要的函式庫。
