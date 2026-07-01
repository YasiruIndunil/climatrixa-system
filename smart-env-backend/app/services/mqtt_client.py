"""
MQTT Client Service — v2.1
───────────────────────────
Brand Key + MAC Address authentication.
No per-device api_key needed.
All Climatrixa devices share one brand key.
Device identity resolved via MAC address lookup in sensors table.
"""
import json
import ssl
import paho.mqtt.client as mqtt
from app.core.config import get_settings
from app.core.database import db

settings = get_settings()

_client: mqtt.Client | None = None

BRAND_KEY = "climatrixa-secret-2026"  # must match firmware


def _on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print("[MQTT] Connected to HiveMQ broker")
        client.subscribe("smartenv/readings", qos=1)
        print("[MQTT] Subscribed to: smartenv/readings")
    else:
        print(f"[MQTT] Connection failed (code {rc})")


def _on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())

        # ── Step 1: Validate brand key (proves it's our product) ──
        if payload.get("brand_key") != BRAND_KEY:
            print(f"[MQTT] Rejected — invalid brand key")
            return

        # ── Step 2: Look up sensor by MAC address ─────────────────
        mac = payload.get("mac", "").upper()
        if not mac:
            print("[MQTT] Rejected — no MAC address in payload")
            return

        sensor = (
            db.table("sensors")
            .select("id, is_active")
            .eq("mac_address", mac)
            .execute()
        )

        if not sensor.data:
            print(f"[MQTT] Rejected — MAC {mac} not registered in system")
            return

        if not sensor.data[0]["is_active"]:
            print(f"[MQTT] Rejected — sensor is inactive")
            return

        sensor_id = sensor.data[0]["id"]

        # ── Step 3: Insert reading ─────────────────────────────────
        insert_data = {
            "sensor_id":   sensor_id,
            "temperature": payload["temperature"],
            "humidity":    payload["humidity"],
            "aqi":         payload["aqi"],
            "pressure":    payload.get("pressure"),
        }
        # Use ESP32 NTP timestamp if provided (accurate for buffered readings)
        if payload.get("recorded_at"):
            insert_data["recorded_at"] = payload["recorded_at"]

        db.table("readings").insert(insert_data).execute()

        print(f"[MQTT] Saved reading from MAC {mac} "
              f"(sensor: {sensor_id[:8]}...) "
              f"temp={payload['temperature']}°C "
              f"aqi={payload['aqi']}")

    except Exception as e:
        print(f"[MQTT] Error processing message: {e}")


def _on_disconnect(client, userdata, disconnect_flags, reason_code, properties=None):
    if reason_code != 0:
        print(f"[MQTT] Unexpected disconnect (code {reason_code}). Will auto-reconnect...")
        import time
        time.sleep(5)
        try:
            _client.reconnect()
            print("[MQTT] Reconnected successfully")
        except Exception as e:
            print(f"[MQTT] Reconnect failed: {e}")


def start_mqtt_listener():
    global _client

    _client = mqtt.Client(
        client_id="climatrixa-backend-prod",
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
    )

    _client.tls_set(tls_version=ssl.PROTOCOL_TLS_CLIENT)
    _client.username_pw_set(settings.mqtt_username, settings.mqtt_password)

    _client.on_connect    = _on_connect
    _client.on_message    = _on_message
    _client.on_disconnect = _on_disconnect

    try:
        _client.connect(settings.mqtt_broker_host, settings.mqtt_broker_port, keepalive=60)
        _client.loop_start()
        print(f"[MQTT] Connecting to {settings.mqtt_broker_host}:{settings.mqtt_broker_port}...")
    except Exception as e:
        print(f"[MQTT] Could not connect: {e}")


def stop_mqtt_listener():
    global _client
    if _client:
        _client.loop_stop()
        _client.disconnect()
        print("[MQTT] Disconnected")
