/*
  Climatrixa - Sensor Test Sketch (v2)
  Reads DHT22 (temperature + humidity), MQ-135 (analog air quality),
  and BME280 (temperature, humidity, pressure) and prints values to
  the Serial Monitor every 3 seconds.

  Wiring (per project wiring plan):
    DHT22   DAT          -> GPIO4  (D4)
    MQ-135  AO           -> GPIO32 (D32)
    BME280  SCL          -> GPIO22 (D22)
    BME280  SDA          -> GPIO21 (D21)
    BME280  CSB          -> 3V3 rail (forces I2C mode)
    BME280  SDO          -> GND rail (sets I2C address to 0x76)
*/

#include <DHT.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>

#define DHTPIN 4         // D4
#define DHTTYPE DHT22
#define MQ135PIN 32       // D32 (ADC1 channel, safe to use with WiFi later)
#define BME280_ADDRESS 0x76  // matches SDO tied to GND

DHT dht(DHTPIN, DHTTYPE);
Adafruit_BME280 bme;
bool bmeFound = false;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("Climatrixa Sensor Test Starting...");

  dht.begin();

  Wire.begin(21, 22);  // SDA, SCL
  bmeFound = bme.begin(BME280_ADDRESS);
  if (!bmeFound) {
    Serial.println("BME280: Sensor not found at address 0x76. Check wiring.");
  }
}

void loop() {
  // ---- DHT22 ----
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();  // Celsius

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("DHT22: Failed to read sensor data!");
  } else {
    Serial.print("DHT22 -> Temperature: ");
    Serial.print(temperature);
    Serial.print(" C, Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");
  }

  // ---- MQ-135 ----
  int mq135Raw = analogRead(MQ135PIN);   // 0-4095 on ESP32 (12-bit ADC)
  Serial.print("MQ-135 -> Raw analog reading: ");
  Serial.println(mq135Raw);

  // ---- BME280 ----
  if (bmeFound) {
    Serial.print("BME280 -> Temperature: ");
    Serial.print(bme.readTemperature());
    Serial.print(" C, Humidity: ");
    Serial.print(bme.readHumidity());
    Serial.print(" %, Pressure: ");
    Serial.print(bme.readPressure() / 100.0F);
    Serial.println(" hPa");
  } else {
    Serial.println("BME280: Not initialized.");
  }

  Serial.println("------------------------------------");
  delay(3000);
}
