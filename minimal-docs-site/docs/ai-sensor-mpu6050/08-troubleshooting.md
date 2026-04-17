---
sidebar_position: 9
title: 08. 常見問題與延伸應用
---

# 常見問題與延伸應用

## 常見問題排查

### 硬體層

| 症狀 | 可能原因 | 解法 |
| ---- | ---- | ---- |
| Pico 無法被電腦辨識 | 沒進 bootloader | 按住 BOOTSEL 再插 USB |
| 板子發燙 | 電源接反或短路 | 立刻拔線，用三用電表檢查 3V3 / GND |
| MPU6050 讀值全為 0 或 `-8.000` | 沒喚醒 / I2C 位址錯 | 確認 `writeRegister(0x6B, 0x00)` 有執行、位址 `0x68` |
| MPU6050 偶爾 NACK | 接線鬆、上拉不足 | 焊接杜邦線、或 SDA/SCL 各加 4.7 kΩ 上拉 |
| SD 卡初始化失敗 | 格式錯、SPI 腳位錯 | 用電腦重格 FAT32、確認 CS=GP9 / SCK=GP10 等 |
| RGB LED 一直全亮 | 共陽極模組 | 把 `digitalWrite(HIGH)` 改 `LOW`，或選共陰模組 |

### 軟體層

| 症狀 | 原因 / 解法 |
| ---- | ---- |
| `error: 'Button2' does not name a type` | 忘記 `arduino-cli lib install Button2` |
| Edge Impulse 函式庫 `#include` 找不到 | 匯入的 zip 名稱與 `#include` 不一致，改首行 include |
| `Sketch too big` | 關閉 Edge Impulse 的非必要 block，或在 Deployment 改 int8 量化 |
| Wi-Fi 連不上 | 台灣部分家用 AP 開 WPA3 only，改 WPA2/WPA3 mixed |
| MQTT 連線 timeout | 防火牆擋 1883；換 port 或檢查 broker 是否對外開放 |
| 推論結果與訓練差很多 | 裝置現場環境（震動、姿態）與錄製時不同，重新採集 |

### Edge Impulse 層

| 症狀 | 解法 |
| ---- | ---- |
| Upload CSV 失敗 | 指定 `Frequency=1000`，`axis names=accX,accY,accZ`（專案 CSV 無 header） |
| Feature Explorer 分群完全重疊 | 動作設計太像，重新規劃 case 或補更差異化資料 |
| 模型 accuracy < 70% | 樣本數不足 / 不均衡；先補資料到每 case ≥ 50 筆再訓練 |

## 延伸應用

### 1. 換感測器：DHT11 溫濕度

`DHT11MQTT/DHT11MQTT.ino` 把 MPU6050 換成 DHT11（GP0 接資料腳 + 10 kΩ 上拉），其餘 Wi-Fi / MQTT 骨架完全相同。每 3 秒上傳一次 `{temperature, humidity}`。

適合示範「AIoT 骨架可搬到任何感測器」，課程後段的作業可讓學員自選感測器（光敏、超音波、PM2.5 ...）接上相同 MQTT 管線。

### 2. 抽離 Wi-Fi 配網樣板：WifiConnector

`WifiConnector/WifiConnector.ino` 只保留 Wi-Fi AP 設定頁與 EEPROM 持久化，**不含感測器和 MQTT**。當您要寫新專案需要「首次開機掃 AP 填 Wi-Fi」的能力，直接從這份複製 `loadConfig / saveConfig / startConfigMode / connectWiFi` 四個函式即可。

:::tip 重構方向
`MQTTwithAI/` 與 `DHT11MQTT/` 目前各自內嵌了一份 Wi-Fi 樣板（約 600 行重複程式碼）。課程進階題：把它們重構成共用的 `.h` library，骨架就是 `WifiConnector/`。
:::

### 3. 自訂 PCB

`PCB/` 已提供 Gerber 與 schematic PDF，可直接送 JLCPCB / PCBWay 打樣。進階版可自行加入：

- TP4056 鋰電池充電 + BQ25895 升壓 → 行動版資料記錄器
- LIS3DH / ICM-42670 等更好的 IMU 替換 MPU6050
- 0.96" OLED 即時顯示推論結果

### 4. 多類別、多感測器融合

一旦熟悉流程，可延伸：

- **震動異常偵測**：把 case0 設為「正常」、case1+ 設為各種異常，輔以 anomaly detection block。
- **手勢辨識**：case0–case9 對應 10 種手勢，搭配 LSTM block。
- **融合加速度 + 陀螺儀**：把 features 由 `[AccX, AccY, AccZ]` 擴充為 6 軸 `[Acc, Gyro]`，辨識率通常明顯提升。

### 5. 從原型到產品

教學專案要上量產前，常見待辦：

- [ ] 替換 default 弱密碼（AP、MQTT）
- [ ] 啟用 TLS + 帳密驗證
- [ ] 加 watchdog（Pico SDK `watchdog_enable`）
- [ ] 加 OTA 升級機制
- [ ] 加低功耗模式（`sleep_ms` / `rtc_sleep`）
- [ ] 資料用 Protobuf 或 CBOR 取代 JSON 以節省頻寬
- [ ] 把 EEPROM 存設定改用 LittleFS（Pico 本來就沒真正 EEPROM）

## 相關資源

- GitHub 專案：[harry123180/AIforSensor-MPU6050](https://github.com/harry123180/AIforSensor-MPU6050)
- arduino-pico 文件：[arduino-pico.readthedocs.io](https://arduino-pico.readthedocs.io/)
- Edge Impulse 官方教材：[docs.edgeimpulse.com](https://docs.edgeimpulse.com/)
- MPU6050 暫存器手冊：[InvenSense MPU-6000/6050 Register Map](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Register-Map1.pdf)

## 結語

到此您已完成：**硬體接線 → 周邊自測 → 資料擷取 → 模型訓練 → 裝置推論 → MQTT 上傳**的完整 AIoT 鏈路。歡迎將自己的延伸專案（例如新感測器、新動作類別、新 dashboard）回饋到 GitHub Issue 或千鉑科技 Wiki。
