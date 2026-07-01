/*
  Climatrixa — Production Firmware v2.1
  ======================================
  Brand API Key authentication + MAC address device identity
  No per-device configuration needed — same firmware for ALL devices
  Admin registers MAC in dashboard to activate a device

  Hardware wiring:
    DHT22   DAT  → GPIO4  (D4)
    MQ-135  AO   → GPIO32 (D32)
    BME280  SCL  → GPIO22 (D22)
    BME280  SDA  → GPIO21 (D21)
    BME280  CSB  → 3V3 rail
    BME280  SDO  → GND rail (I2C address 0x76)

  Partition scheme: Default 4MB with spiffs (1.2MB APP/1.5MB SPIFFS)
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <time.h>

// ── WIFI NETWORKS ────────────────────────────────────────────────
struct WifiNetwork { const char* ssid; const char* password; };
const WifiNetwork WIFI_NETWORKS[] = {
  { "SLT-Fiber-A27D", "Vg2052048"   },  // Home WiFi
  { "iPhone",         "12345678" },  // Mobile hotspot fallback
};
const int WIFI_NETWORK_COUNT = sizeof(WIFI_NETWORKS) / sizeof(WIFI_NETWORKS[0]);

// ── BRAND KEY (same for ALL Climatrixa devices) ───────────────────
const char* BRAND_KEY = "climatrixa-secret-2026";
// ─────────────────────────────────────────────────────────────────

// ── HIVEMQ BROKER ────────────────────────────────────────────────
const char* MQTT_HOST  = "41fb6d98e88d4924970fbda5ada55f22.s1.eu.hivemq.cloud";
const int   MQTT_PORT  = 8883;
const char* MQTT_USER  = "YasiruIndunil";
const char* MQTT_PASS  = "Yasiru@4G";
const char* MQTT_TOPIC = "smartenv/readings";  // single topic for all devices
// ─────────────────────────────────────────────────────────────────

// ── NTP ──────────────────────────────────────────────────────────
const char* NTP_SERVER = "pool.ntp.org";

// ── PINS ─────────────────────────────────────────────────────────
#define DHTPIN    4
#define DHTTYPE   DHT22
#define MQ135PIN  32
#define BME_SDA   21
#define BME_SCL   22
#define BME_ADDR  0x76

// ── TIMING ───────────────────────────────────────────────────────
const unsigned long PUBLISH_INTERVAL_MS = 30000;
const unsigned long WIFI_PER_NETWORK_MS = 12000;
const unsigned long MQTT_RETRY_MS       = 5000;
const char* BUFFER_FILE = "/buffer.jsonl";
const size_t MAX_BUFFER_BYTES = 1500000;

// ── HiveMQ root CA ───────────────────────────────────────────────
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

// ── OBJECTS ──────────────────────────────────────────────────────
DHT              dht(DHTPIN, DHTTYPE);
Adafruit_BME280  bme;
WiFiClientSecure wifiClient;
PubSubClient     mqtt(wifiClient);

bool   bmeOk          = false;
bool   timeIsSynced   = false;
String macAddress     = "";
unsigned long lastPublish      = 0;
unsigned long lastMqttRetry    = 0;
unsigned long lastFlushAttempt = 0;

// ─────────────────────────────────────────────────────────────────
void setupWiFi() {
  WiFi.mode(WIFI_STA);
  for (int i = 0; i < WIFI_NETWORK_COUNT; i++) {
    Serial.printf("\n[WiFi] Trying %d/%d: %s",
                  i+1, WIFI_NETWORK_COUNT, WIFI_NETWORKS[i].ssid);
    WiFi.begin(WIFI_NETWORKS[i].ssid, WIFI_NETWORKS[i].password);
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED) {
      if (millis() - start > WIFI_PER_NETWORK_MS) {
        Serial.printf("\n[WiFi] %s timed out\n", WIFI_NETWORKS[i].ssid);
        WiFi.disconnect(); delay(500); break;
      }
      delay(500); Serial.print(".");
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf("\n[WiFi] Connected to: %s\n", WIFI_NETWORKS[i].ssid);
      Serial.printf("[WiFi] IP: %s\n", WiFi.localIP().toString().c_str());
      return;
    }
  }
  Serial.println("\n[WiFi] All networks failed");
}

// ─────────────────────────────────────────────────────────────────
void syncNTP() {
  if (!WiFi.isConnected()) return;
  Serial.print("[NTP] Syncing...");
  configTime(0, 0, NTP_SERVER);
  struct tm t;
  int attempts = 0;
  while (!getLocalTime(&t) && attempts++ < 10) { delay(500); Serial.print("."); }
  if (attempts < 10) {
    timeIsSynced = true;
    char buf[32]; strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S UTC", &t);
    Serial.printf("\n[NTP] Synced: %s\n", buf);
  } else {
    Serial.println("\n[NTP] Failed — will retry");
  }
}

// ─────────────────────────────────────────────────────────────────
String getTimestamp() {
  if (!timeIsSynced) return "";
  time_t now; time(&now);
  struct tm t; gmtime_r(&now, &t);
  char buf[32]; strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &t);
  return String(buf);
}

// ─────────────────────────────────────────────────────────────────
bool connectMQTT() {
  if (millis() - lastMqttRetry < MQTT_RETRY_MS) return false;
  lastMqttRetry = millis();
  Serial.printf("[MQTT] Connecting...");
  // Use MAC as unique client ID
  String clientId = "climatrixa-" + macAddress;
  clientId.replace(":", "");
  if (mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)) {
    Serial.println(" Connected!");
    return true;
  }
  Serial.printf(" Failed (state %d)\n", mqtt.state());
  return false;
}

// ─────────────────────────────────────────────────────────────────
bool buildPayload(char* buf, size_t bufSize) {
  float dht_temp = dht.readTemperature();
  float dht_hum  = dht.readHumidity();
  bool  dhtOk    = !isnan(dht_temp) && !isnan(dht_hum);

  int   aqi_raw      = analogRead(MQ135PIN);
  float bme_temp     = bmeOk ? bme.readTemperature()       : 0.0f;
  float bme_hum      = bmeOk ? bme.readHumidity()          : 0.0f;
  float bme_pressure = bmeOk ? bme.readPressure() / 100.0f : 0.0f;

  float temperature = bmeOk ? bme_temp : (dhtOk ? dht_temp : 0.0f);
  float humidity    = bmeOk ? bme_hum  : (dhtOk ? dht_hum  : 0.0f);

  StaticJsonDocument<300> doc;
  doc["brand_key"]   = BRAND_KEY;          // proves it's our product
  doc["mac"]         = macAddress;         // identifies which device
  doc["temperature"] = round(temperature * 100.0) / 100.0;
  doc["humidity"]    = round(humidity    * 100.0) / 100.0;
  doc["aqi"]         = aqi_raw;
  doc["pressure"]    = round(bme_pressure * 100.0) / 100.0;

  String ts = getTimestamp();
  if (ts.length() > 0) doc["recorded_at"] = ts;

  size_t len = serializeJson(doc, buf, bufSize);

  Serial.println("\n──────────────────────────────────────────");
  Serial.printf("[MAC]    %s\n", macAddress.c_str());
  Serial.printf("[DHT22]  Temp: %.2f°C  Hum: %.2f%%\n",
                dhtOk ? dht_temp : 0.0f, dhtOk ? dht_hum : 0.0f);
  Serial.printf("[MQ-135] AQI raw: %d\n", aqi_raw);
  if (bmeOk) Serial.printf("[BME280] Temp: %.2f°C  Hum: %.2f%%  Pressure: %.2f hPa\n",
                            bme_temp, bme_hum, bme_pressure);
  Serial.printf("[Time]   %s\n", ts.length() ? ts.c_str() : "not synced");
  return len > 0;
}

// ─────────────────────────────────────────────────────────────────
void saveToBuffer(const char* payload) {
  File f = LittleFS.open(BUFFER_FILE, "a");
  if (!f) return;
  f.println(payload);
  f.close();
  Serial.println("[Buffer] Saved locally");
}

// ─────────────────────────────────────────────────────────────────
void flushBuffer() {
  if (!mqtt.connected()) return;
  if (!LittleFS.exists(BUFFER_FILE)) return;
  File f = LittleFS.open(BUFFER_FILE, "r");
  if (!f || f.size() == 0) { if (f) f.close(); return; }
  Serial.printf("[Buffer] Flushing %u bytes...\n", f.size());
  int sent = 0;
  String remaining = "";
  while (f.available()) {
    String line = f.readStringUntil('\n'); line.trim();
    if (line.length() == 0) continue;
    if (mqtt.publish(MQTT_TOPIC, line.c_str())) { sent++; delay(40); }
    else {
      remaining = line + "\n";
      while (f.available()) remaining += f.readStringUntil('\n') + "\n";
      break;
    }
  }
  f.close();
  if (remaining.length() > 0) {
    File rf = LittleFS.open(BUFFER_FILE, "w");
    rf.print(remaining); rf.close();
    Serial.printf("[Buffer] Sent %d, %u bytes remaining\n", sent, remaining.length());
  } else {
    LittleFS.remove(BUFFER_FILE);
    Serial.printf("[Buffer] All %d readings flushed\n", sent);
  }
}

// ─────────────────────────────────────────────────────────────────
void publishOrBuffer() {
  char payload[300];
  if (!buildPayload(payload, sizeof(payload))) return;
  if (mqtt.connected()) {
    bool ok = mqtt.publish(MQTT_TOPIC, payload);
    Serial.printf("[MQTT]   %s\n", ok ? "Published OK" : "FAILED — buffering");
    if (!ok) saveToBuffer(payload);
  } else {
    Serial.println("[MQTT]   Offline — buffering");
    saveToBuffer(payload);
  }
}

// ─────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n========================================");
  Serial.println("  Climatrixa Firmware v2.1              ");
  Serial.println("  Brand Key + MAC Authentication        ");
  Serial.println("========================================");

  // Read MAC address from chip
  WiFi.mode(WIFI_STA);
  macAddress = WiFi.macAddress();
  Serial.printf("[Device] MAC Address: %s\n", macAddress.c_str());
  Serial.printf("[Device] Brand Key:   %s\n", BRAND_KEY);

  // Mount flash filesystem
  if (!LittleFS.begin(true)) {
    Serial.println("[LittleFS] Mount failed");
  } else {
    Serial.println("[LittleFS] Mounted OK");
    if (LittleFS.exists(BUFFER_FILE)) {
      File f = LittleFS.open(BUFFER_FILE, "r");
      Serial.printf("[LittleFS] Existing buffer: %u bytes\n", f.size());
      f.close();
    }
  }

  dht.begin();
  Serial.println("[DHT22]  Ready");

  Wire.begin(BME_SDA, BME_SCL);
  bmeOk = bme.begin(BME_ADDR);
  Serial.printf("[BME280] %s\n", bmeOk ? "Ready" : "Not found");

  wifiClient.setCACert(HIVEMQ_ROOT_CA);
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setKeepAlive(60);
  mqtt.setBufferSize(512);

  setupWiFi();
  if (WiFi.isConnected()) { syncNTP(); connectMQTT(); }

  Serial.printf("[System] Topic:    %s\n", MQTT_TOPIC);
  Serial.printf("[System] Interval: every %lu seconds\n", PUBLISH_INTERVAL_MS/1000);
  Serial.println("[System] Running...\n");
}

// ─────────────────────────────────────────────────────────────────
void loop() {
  if (WiFi.status() != WL_CONNECTED) { setupWiFi(); if (WiFi.isConnected() && !timeIsSynced) syncNTP(); }
  if (WiFi.isConnected() && !mqtt.connected()) connectMQTT();
  if (WiFi.isConnected() && !timeIsSynced) syncNTP();
  mqtt.loop();
  if (millis() - lastPublish >= PUBLISH_INTERVAL_MS || lastPublish == 0) {
    lastPublish = millis();
    publishOrBuffer();
  }
  if (mqtt.connected() && millis() - lastFlushAttempt >= 10000) {
    lastFlushAttempt = millis();
    flushBuffer();
  }
}
