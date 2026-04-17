---
sidebar_position: 7
title: 06. 裝置端推論
---

# 裝置端推論

把 Edge Impulse 匯出的 Arduino library 與 `Inferencing/Inferencing.ino` 結合，讓 Pico 2 W 獨立執行動作分類，結果直接印到序列埠。

## 草稿結構

`Inferencing/Inferencing.ino` 主要步驟：

```cpp
#include <a20260414_inferencing.h>  // ← 改成您的函式庫名
#include <Wire.h>

#define EIDSP_QUANTIZE_FILTERBANK 0   // 記憶體優化

static float features[EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE];

int raw_feature_get_data(size_t offset, size_t length, float *out_ptr) {
  memcpy(out_ptr, features + offset, length * sizeof(float));
  return 0;
}

void setup() {
  Serial.begin(115200);
  initMPU6050();                      // Wire1 + 4 個暫存器
}

void loop() {
  // 1) 以 1 kHz 填滿 features[] (3000 個 float)
  // 2) 呼叫 run_classifier()
  // 3) 印出每個 label 的機率
}
```

## 核心分類呼叫

```cpp
ei::signal_t signal;
signal.total_length = EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE;
signal.get_data = &raw_feature_get_data;

ei_impulse_result_t result = { 0 };
EI_IMPULSE_ERROR res = run_classifier(&signal, &result, false);

Serial.print("Predictions: ");
for (size_t ix = 0; ix < EI_CLASSIFIER_LABEL_COUNT; ix++) {
  Serial.print(result.classification[ix].label);
  Serial.print(": ");
  Serial.print(result.classification[ix].value, 3);
  Serial.print("  ");
}
Serial.println();
```

## 編譯與上傳

```bash
arduino-cli compile --fqbn rp2040:rp2040:pico_w Inferencing/Inferencing.ino
arduino-cli upload  --fqbn rp2040:rp2040:pico_w --port COM6 Inferencing/Inferencing.ino
```

## 預期序列埠輸出

```
Edge Impulse MPU6050 Inference
================================
Initializing MPU6050... OK

Model information:
Sampling length: 1000 ms
Frame size: 3000
Classes: case0, case1, case2, case3

Collecting 1000 samples...
Predictions: case0: 0.012  case1: 0.934  case2: 0.038  case3: 0.016
Collecting 1000 samples...
Predictions: case0: 0.981  case1: 0.004  case2: 0.010  case3: 0.005
```

每 1 秒印一次分類結果，最大機率對應的 label 就是當下判定動作。

## 調整判定規則

`Inferencing.ino` 預設只是把機率印出來。實務上常加入 **信心閾值** 避免誤判：

```cpp
float max_val = 0;
int   max_idx = -1;
for (size_t ix = 0; ix < EI_CLASSIFIER_LABEL_COUNT; ix++) {
  if (result.classification[ix].value > max_val) {
    max_val = result.classification[ix].value;
    max_idx = ix;
  }
}

if (max_val > 0.7) {   // ← 閾值可調
  Serial.printf("✔ 判定為 %s (信心 %.2f)\n",
                result.classification[max_idx].label, max_val);
} else {
  Serial.println("? 低信心，略過");
}
```

## 延遲與吞吐量

Pico 2 W（RP2350）執行 Edge Impulse 2 層 Dense 分類器，典型指標：

| 項目 | 數值 |
| ---- | ---- |
| DSP（Spectral analysis） | 約 50–80 ms |
| NN Inference | 約 5–15 ms |
| 每秒最多分類次數 | 8–10 次（含 1 秒資料收集就降為 1 次） |

若要加快，可將 window increase 調小、或減小 FFT length、或改用 1D-CNN 再量化。

## Flash / RAM 使用

編譯輸出範例：

```
Sketch uses 420 KB (20%) of program storage space. Maximum is 2 MB.
Global variables use 68 KB (13%) of dynamic memory, leaving 452 KB for local variables.
```

Pico 2 W 有 2 MB flash、520 KB SRAM，相當充裕。若超出，請回 Edge Impulse 的 Deployment 勾選更激進的量化（int8）。

## 常見問題

| 症狀 | 可能原因 |
| ---- | ---- |
| `Failed to run classifier (-5)` | features 沒填滿 3000 個，通常是 MPU6050 讀取失敗 |
| 一直輸出同一個 label | 樣本偏移，回檢查 Feature Explorer 分群是否重疊 |
| 推論結果與訓練時差很多 | 訓練資料與現場環境不同（例如震動頻率、板子姿態），重新採集 |

## 下一步

把推論結果送上雲端 → [第 07 章：Wi-Fi 配網與 MQTT 上傳](./07-aiot-mqtt.md)。
