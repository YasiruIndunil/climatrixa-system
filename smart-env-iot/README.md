# Smart Env IoT

ESP32 sensor firmware for the Climatrixa environmental monitoring system.

## Status: in progress

- ESP32-WROOM-32 DevKit, DHT22, and MQ-135 sensors wired and validated
- Test sketch (`firmware/sensor_test/`) confirms both sensors produce stable, plausible readings via Serial Monitor
- BME280 (humidity/pressure) sensor ordered, not yet wired
- Production firmware (WiFi + MQTT publishing to backend) not yet started

## Hardware

| Component | Pin |
|---|---|
| DHT22 data | GPIO4 (D4) |
| MQ-135 analog out | GPIO32 (D32) |
| BME280 SCL | GPIO22 (D22) — planned |
| BME280 SDA | GPIO21 (D21) — planned |

All sensors share the ESP32's 3V3 and GND rails via a breadboard.

## Next steps

1. Wire BME280 once it arrives
2. Extend `sensor_test.ino` into production firmware: WiFi connection, MQTT publish to HiveMQ broker, JSON-formatted readings on a 30-second interval (see backend's `app/services/mqtt_client.py` for the expected message format)
