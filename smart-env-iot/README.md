# Smart Env IoT

ESP32 sensor firmware for the Climatrixa environmental monitoring system.

## Status: in progress

- ESP32-WROOM-32 DevKit, DHT22, MQ-135, and BME280 sensors wired and validated together
- Test sketch (`firmware/sensor_test/`) confirms all three sensors produce stable, plausible readings simultaneously via Serial Monitor
- Production firmware (WiFi + MQTT publishing to backend) not yet started

## Hardware

| Component | Pin |
|---|---|
| DHT22 data | GPIO4 (D4) |
| MQ-135 analog out | GPIO32 (D32) |
| BME280 SCL | GPIO22 (D22) |
| BME280 SDA | GPIO21 (D21) |
| BME280 CSB | 3V3 rail (forces I2C mode) |
| BME280 SDO | GND rail (sets I2C address 0x76) |

All sensors share the ESP32's 3V3 and GND rails via a breadboard.

## Next steps

1. Extend `sensor_test.ino` into production firmware: WiFi connection, MQTT publish to HiveMQ broker, JSON-formatted readings on a 30-second interval (see backend's `app/services/mqtt_client.py` for the expected message format)
2. Resolve HiveMQ broker authentication ("Not authorized" error currently seen on the backend side) before firmware can successfully publish
