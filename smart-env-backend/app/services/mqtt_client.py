"""
MQTT Client Service
────────────────────
Connects to HiveMQ and listens for sensor data published by ESP32 devices.
Runs as a background thread when FastAPI starts.

Topic structure:
    smartenv/{sensor_id}/data    ← ESP32 publishes here
    smartenv/{sensor_id}/status  ← heartbeat / online status

Payload format (JSON):
    {
        "temperature": 28.5,
        "humidity": 62.3,
        "aqi": 45.0,
        "pressure": 1013.2,
        "api_key": "device-key-here"
    }
"""
import json
import ssl
import threading
import paho.mqtt.client as mqtt
from app.core.config import get_settings
from app.core.database import db

settings = get_settings()

_client: mqtt.Client | None = None


def _on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"[MQTT] Connected to HiveMQ broker")
        # Subscribe to all sensor data topics
        topic = f"{settings.mqtt_topic_prefix}/+/data"
        client.subscribe(topic, qos=1)
        print(f"[MQTT] Subscribed to: {topic}")
    else:
        print(f"[MQTT] Connection failed with code {rc}")


def _on_message(client, userdata, msg):
    """Called every time an ESP32 publishes a reading."""
    try:
        # Extract sensor_id from topic: smartenv/{sensor_id}/data
        parts = msg.topic.split("/")
        if len(parts) < 3:
            return
        sensor_id = parts[1]

        payload = json.loads(msg.payload.decode())

        # Validate device API key
        sensor = (
            db.table("sensors")
            .select("id, is_active")
            .eq("id", sensor_id)
            .eq("api_key", payload.get("api_key", ""))
            .execute()
        )

        if not sensor.data or not sensor.data[0]["is_active"]:
            print(f"[MQTT] Rejected message from sensor {sensor_id} — invalid api_key")
            return

        # Save reading to Supabase
        db.table("readings").insert({
            "sensor_id":   sensor_id,
            "temperature": payload["temperature"],
            "humidity":    payload["humidity"],
            "aqi":         payload["aqi"],
            "pressure":    payload.get("pressure"),
        }).execute()

        print(f"[MQTT] Saved reading from sensor {sensor_id}: "
              f"temp={payload['temperature']}°C, "
              f"humidity={payload['humidity']}%, "
              f"aqi={payload['aqi']}")

    except Exception as e:
        print(f"[MQTT] Error processing message: {e}")


def _on_disconnect(client, userdata, disconnect_flags, reason_code, properties=None):
    if reason_code != 0:
        print(f"[MQTT] Unexpected disconnect (code {reason_code}). Will auto-reconnect...")


def start_mqtt_listener():
    """
    Start the MQTT client in a background thread.
    Called once when FastAPI starts up (see main.py lifespan).
    """
    global _client

    _client = mqtt.Client(
        client_id="smart-env-backend",
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2
    )

    # HiveMQ requires TLS on port 8883
    _client.tls_set(tls_version=ssl.PROTOCOL_TLS_CLIENT)
    _client.username_pw_set(settings.mqtt_username, settings.mqtt_password)

    _client.on_connect    = _on_connect
    _client.on_message    = _on_message
    _client.on_disconnect = _on_disconnect

    try:
        _client.connect(settings.mqtt_broker_host, settings.mqtt_broker_port, keepalive=60)
        # loop_start() runs the MQTT network loop in a background thread
        _client.loop_start()
        print(f"[MQTT] Connecting to {settings.mqtt_broker_host}:{settings.mqtt_broker_port}...")
    except Exception as e:
        print(f"[MQTT] Could not connect: {e}. Readings via HTTP POST still work.")


def stop_mqtt_listener():
    """Called when FastAPI shuts down."""
    global _client
    if _client:
        _client.loop_stop()
        _client.disconnect()
        print("[MQTT] Disconnected")
