/*
  Climatrixa — Production Firmware v1.1
  ======================================
  ESP32-WROOM-32 with DHT22, MQ-135, BME280
  Publishes sensor readings every 30s to HiveMQ via MQTT/TLS
  Auto-reconnects WiFi (tries home first, mobile hotspot as fallback)

  Hardware wiring:
    DHT22   DAT  → GPIO4  (D4)
    MQ-135  AO   → GPIO32 (D32)
    BME280  SCL  → GPIO22 (D22)
    BME280  SDA  → GPIO21 (D21)
    BME280  CSB  → 3V3 rail
    BME280  SDO  → GND rail (I2C address 0x76)
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <ArduinoJson.h>

// ── WIFI NETWORKS (tries in order, first success wins) ────────────
struct WifiNetwork {
  const char* ssid;
  const char* password;
};

const WifiNetwork WIFI_NETWORKS[] = {
  { "SLT-Fiber-2.4G-A27D", "*******" },   // Home WiFi — tries first
  { "iPhone", "********" },  // Mobile hotspot — fallback
  // Add more networks here if needed:
  // { "OtherNetwork", "OtherPass"  },
};
const int WIFI_NETWORK_COUNT = sizeof(WIFI_NETWORKS) / sizeof(WIFI_NETWORKS[0]);
// ─────────────────────────────────────────────────────────────────

// ── SENSOR CREDENTIALS (do not change) ───────────────────────────
const char* SENSOR_ID = "f2a82465-ec5e-4961-88f0-8c40d1927c25";
const char* API_KEY   = "0af5aa2ecbae9eb480ffa3d3c1b28f4c3143eba6db5f8e87";
// ─────────────────────────────────────────────────────────────────

// ── HIVEMQ BROKER ────────────────────────────────────────────────
const char* MQTT_HOST = "41fb6d98e88d4924970fbda5ada55f22.s1.eu.hivemq.cloud";
const int   MQTT_PORT = 8883;
const char* MQTT_USER = "YasiruIndunil";
const char* MQTT_PASS = "Yasiru@4G#1";
// ─────────────────────────────────────────────────────────────────

// ── PINS ─────────────────────────────────────────────────────────
#define DHTPIN    4
#define DHTTYPE   DHT22
#define MQ135PIN  32
#define BME_SDA   21
#define BME_SCL   22
#define BME_ADDR  0x76
// ─────────────────────────────────────────────────────────────────

// ── TIMING ───────────────────────────────────────────────────────
const unsigned long PUBLISH_INTERVAL_MS = 30000;  // 30 seconds
const unsigned long WIFI_PER_NETWORK_MS = 12000;  // 12s per network attempt
const unsigned long MQTT_RETRY_MS       = 5000;   // 5s between MQTT retries
// ─────────────────────────────────────────────────────────────────

// ── HiveMQ root CA (ISRG Root X1 — valid until 2035) ─────────────
static const char HIVEMQ_ROOT_CA[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoBggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----
)EOF";
// ─────────────────────────────────────────────────────────────────

// ── GLOBAL OBJECTS ────────────────────────────────────────────────
DHT              dht(DHTPIN, DHTTYPE);
Adafruit_BME280  bme;
WiFiClientSecure wifiClient;
PubSubClient     mqtt(wifiClient);

bool bmeOk = false;
unsigned long lastPublish   = 0;
unsigned long lastMqttRetry = 0;
char mqttTopic[80];
char clientId[40];

// ─────────────────────────────────────────────────────────────────
void setupWiFi() {
  WiFi.mode(WIFI_STA);

  for (int i = 0; i < WIFI_NETWORK_COUNT; i++) {
    Serial.printf("\n[WiFi] Trying %d/%d: %s",
                  i + 1, WIFI_NETWORK_COUNT, WIFI_NETWORKS[i].ssid);

    WiFi.begin(WIFI_NETWORKS[i].ssid, WIFI_NETWORKS[i].password);

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED) {
      if (millis() - start > WIFI_PER_NETWORK_MS) {
        Serial.printf("\n[WiFi] %s timed out\n", WIFI_NETWORKS[i].ssid);
        WiFi.disconnect();
        delay(500);
        break;
      }
      delay(500);
      Serial.print(".");
    }

    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf("\n[WiFi] ✓ Connected to: %s\n", WIFI_NETWORKS[i].ssid);
      Serial.printf("[WiFi]   IP address:  %s\n",
                    WiFi.localIP().toString().c_str());
      return;  // success — stop trying other networks
    }
  }

  Serial.println("\n[WiFi] All networks failed — will retry in loop");
}

// ─────────────────────────────────────────────────────────────────
bool connectMQTT() {
  if (millis() - lastMqttRetry < MQTT_RETRY_MS) return false;
  lastMqttRetry = millis();

  Serial.printf("[MQTT] Connecting as %s...", clientId);
  if (mqtt.connect(clientId, MQTT_USER, MQTT_PASS)) {
    Serial.println(" Connected!");
    return true;
  }
  Serial.printf(" Failed (state %d)\n", mqtt.state());
  return false;
}

// ─────────────────────────────────────────────────────────────────
void publishReading() {
  // ── Read DHT22 ──────────────────────────────────────────────────
  float dht_temp = dht.readTemperature();
  float dht_hum  = dht.readHumidity();
  bool  dhtOk    = !isnan(dht_temp) && !isnan(dht_hum);

  // ── Read MQ-135 ─────────────────────────────────────────────────
  int aqi_raw = analogRead(MQ135PIN);  // 0-4095 (12-bit ADC)

  // ── Read BME280 ─────────────────────────────────────────────────
  float bme_temp     = bmeOk ? bme.readTemperature()       : 0.0f;
  float bme_hum      = bmeOk ? bme.readHumidity()          : 0.0f;
  float bme_pressure = bmeOk ? bme.readPressure() / 100.0f : 0.0f;

  // ── Best available values ────────────────────────────────────────
  // BME280 is more accurate — prefer it; fall back to DHT22
  float temperature = bmeOk ? bme_temp : (dhtOk ? dht_temp : 0.0f);
  float humidity    = bmeOk ? bme_hum  : (dhtOk ? dht_hum  : 0.0f);
  float pressure    = bme_pressure;

  // ── Build JSON ──────────────────────────────────────────────────
  StaticJsonDocument<256> doc;
  doc["sensor_id"]   = SENSOR_ID;
  doc["api_key"]     = API_KEY;
  doc["temperature"] = round(temperature * 100.0) / 100.0;
  doc["humidity"]    = round(humidity    * 100.0) / 100.0;
  doc["aqi"]         = aqi_raw;
  doc["pressure"]    = round(pressure   * 100.0) / 100.0;

  char payload[256];
  serializeJson(doc, payload);

  // ── Publish ─────────────────────────────────────────────────────
  bool ok = mqtt.publish(mqttTopic, payload, false);

  // ── Serial log ──────────────────────────────────────────────────
  Serial.println("\n──────────────────────────────────────────");
  Serial.printf("[DHT22]  Temp: %.2f°C  Hum: %.2f%%\n",
                dhtOk ? dht_temp : 0.0f, dhtOk ? dht_hum : 0.0f);
  Serial.printf("[MQ-135] AQI raw: %d\n", aqi_raw);
  if (bmeOk)
    Serial.printf("[BME280] Temp: %.2f°C  Hum: %.2f%%  Pressure: %.2f hPa\n",
                  bme_temp, bme_hum, bme_pressure);
  Serial.printf("[MQTT]   %s → %s\n", ok ? "Published OK" : "FAILED", mqttTopic);
  Serial.printf("[Data]   %s\n", payload);
}

// ─────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n========================================");
  Serial.println("  Climatrixa Production Firmware v1.1  ");
  Serial.println("========================================");

  // Build MQTT topic and client ID from sensor UUID
  snprintf(mqttTopic, sizeof(mqttTopic), "smartenv/%s/data", SENSOR_ID);
  snprintf(clientId,  sizeof(clientId),  "esp32-%s",
           String(SENSOR_ID).substring(0, 8).c_str());

  // Init sensors
  dht.begin();
  Serial.println("[DHT22]  Ready");

  Wire.begin(BME_SDA, BME_SCL);
  bmeOk = bme.begin(BME_ADDR);
  Serial.printf("[BME280] %s\n", bmeOk ? "Ready" : "Not found — check wiring");

  // Skip certificate verification (for testing)
  wifiClient.setInsecure();

  // MQTT config
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setKeepAlive(60);
  mqtt.setSocketTimeout(10);
  mqtt.setBufferSize(512);

  // Connect WiFi (tries all networks in order)
  setupWiFi();

  // Connect MQTT
  if (WiFi.isConnected()) connectMQTT();

  Serial.printf("\n[System] Topic:    %s\n", mqttTopic);
  Serial.printf("[System] Interval: every %lu seconds\n",
                PUBLISH_INTERVAL_MS / 1000);
  Serial.println("[System] Running...\n");
}

// ─────────────────────────────────────────────────────────────────
void loop() {
  // ── Reconnect WiFi if dropped ───────────────────────────────────
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Connection lost — reconnecting...");
    setupWiFi();
  }

  // ── Reconnect MQTT if dropped ───────────────────────────────────
  if (WiFi.isConnected() && !mqtt.connected()) {
    connectMQTT();
  }

  mqtt.loop();

  // ── Publish every 30 seconds ────────────────────────────────────
  if (mqtt.connected() &&
      (millis() - lastPublish >= PUBLISH_INTERVAL_MS || lastPublish == 0)) {
    lastPublish = millis();
    publishReading();
  }
}
