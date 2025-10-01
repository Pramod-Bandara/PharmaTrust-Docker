#include <DHT.h>

// ====== USB Fallback (Arduino-compatible, e.g., Uno) ======
// Streams JSON lines over Serial for a host process to forward to the API.
// This does not require WiFi on the microcontroller.

// DHT sensor configuration (adjust pin/type for your hardware)
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// Identifiers
const char* DEVICE_ID = "UNO_DHT22_001";
const char* DEFAULT_BATCH_ID = "BATCH_DEFAULT";

// Post interval (ms) – host will forward
const unsigned long INTERVAL_MS = 30000UL;

// Validation thresholds
const float TEMP_MIN_VALID = -40.0;
const float TEMP_MAX_VALID = 80.0;
const float HUM_MIN_VALID = 0.0;
const float HUM_MAX_VALID = 100.0;

unsigned long lastMs = 0;

bool isReadingValid(float temperature, float humidity) {
  if (isnan(temperature) || isnan(humidity)) return false;
  if (temperature < TEMP_MIN_VALID || temperature > TEMP_MAX_VALID) return false;
  if (humidity < HUM_MIN_VALID || humidity > HUM_MAX_VALID) return false;
  return true;
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  // Warm-up delay for Serial connections
  delay(1500);
  Serial.println(F("{\"event\":\"startup\",\"source\":\"usb-fallback\",\"ok\":true}"));
}

void loop() {
  unsigned long now = millis();
  if (now - lastMs >= INTERVAL_MS) {
    lastMs = now;

    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    if (!isReadingValid(temperature, humidity)) {
      Serial.println(F("{\"event\":\"reading_invalid\"}"));
    } else {
      // Emit newline-delimited JSON for host forwarder
      Serial.print(F("{\"batchId\":\""));
      Serial.print(DEFAULT_BATCH_ID);
      Serial.print(F("\",\"deviceId\":\""));
      Serial.print(DEVICE_ID);
      Serial.print(F("\",\"temperature\":"));
      Serial.print(temperature, 2);
      Serial.print(F(",\"humidity\":"));
      Serial.print(humidity, 2);
      Serial.print(F(",\"timestamp\":\""));
      // Simple ISO-like timestamp using millis (host can ignore)
      Serial.print(millis());
      Serial.println(F("\"}"));
    }
  }

  delay(20);
}


