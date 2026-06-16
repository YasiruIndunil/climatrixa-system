/*
  Climatrixa - Sensor Test Sketch
  Reads DHT22 (temperature + humidity) and MQ-135 (analog air quality)
  and prints values to the Serial Monitor every 3 seconds.

  Wiring (per project wiring plan):
    DHT22  DAT -> GPIO4  (D4)
    MQ-135 AO  -> GPIO32 (D32)
*/

#include <DHT.h>

#define DHTPIN 4        // D4
#define DHTTYPE DHT22
#define MQ135PIN 32      // D32 (ADC1 channel, safe to use with WiFi later)

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("Climatrixa Sensor Test Starting...");

  dht.begin();
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

  Serial.println("------------------------------------");
  delay(3000);
}
