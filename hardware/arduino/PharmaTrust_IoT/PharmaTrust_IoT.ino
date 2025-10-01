#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ====== Configuration ======
// WiFi credentials
const char* WIFI_SSID = "YOUR_SSID";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";

// Gateway host and endpoint (Docker maps port 3000 → NGINX)
const char* GATEWAY_HOST = "http://192.168.1.100:3000"; // change to your machine IP if needed
const char* IOT_POST_PATH = "/api/iot/readings";       // proxied to IoT service /readings
const char* IOT_HEALTH_PATH = "/api/iot/health";       // proxied to IoT service /health

// Device/Batch identifiers
const char* DEVICE_ID = "DHT22_001";
const char* DEFAULT_BATCH_ID = "BATCH_DEFAULT";

// Posting interval (ms)
const unsigned long POST_INTERVAL_MS = 30000UL; // 30 seconds

// DHT sensor configuration
#define DHTPIN 4       // GPIO where DHT is connected
#define DHTTYPE DHT22  // DHT 22 (AM2302)
DHT dht(DHTPIN, DHTTYPE);

// LED indicators (use built-in LED if board supports)
const int LED_OK = 2;     // OK/connected indicator
const int LED_TX = 15;    // Transmit activity
const int LED_ERR = 5;    // Error indicator

// Validation thresholds
const float TEMP_MIN_VALID = -40.0;
const float TEMP_MAX_VALID = 80.0;
const float HUM_MIN_VALID = 0.0;
const float HUM_MAX_VALID = 100.0;

// Retry configuration
const int MAX_RETRIES = 3;
const unsigned long RETRY_BACKOFF_MS = 2000UL; // exponential backoff base
const unsigned long WIFI_RECONNECT_BASE_MS = 2000UL; // WiFi reconnect backoff base
const unsigned long WIFI_RECONNECT_MAX_MS = 30000UL; // cap backoff at 30s
const uint16_t HTTP_TIMEOUT_MS = 8000; // http read timeout

unsigned long lastPostMs = 0;
unsigned long lastWifiAttemptMs = 0;
unsigned long currentWifiBackoffMs = WIFI_RECONNECT_BASE_MS;

// ====== Utilities ======
void setLed(int pin, bool on) {
  pinMode(pin, OUTPUT);
  digitalWrite(pin, on ? HIGH : LOW);
}

void blink(int pin, int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    setLed(pin, true);
    delay(delayMs);
    setLed(pin, false);
    delay(delayMs);
  }
}

bool isReadingValid(float temperature, float humidity) {
  if (isnan(temperature) || isnan(humidity)) return false;
  if (temperature < TEMP_MIN_VALID || temperature > TEMP_MAX_VALID) return false;
  if (humidity < HUM_MIN_VALID || humidity > HUM_MAX_VALID) return false;
  return true;
}

bool httpGet(const String& url) {
  HTTPClient http;
  http.setReuse(false);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.begin(url);
  int code = http.GET();
  http.end();
  return code > 0 && code >= 200 && code < 400;
}

bool postReading(const String& url, const char* batchId, float temperature, float humidity) {
  StaticJsonDocument<256> doc;
  doc["batchId"] = batchId;
  doc["deviceId"] = DEVICE_ID;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;

  String payload;
  serializeJson(doc, payload);

  HTTPClient http;
  http.setReuse(false);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  int code = http.POST(payload);
  http.end();
  return code > 0 && code >= 200 && code < 400;
}

void onWiFiEvent(WiFiEvent_t event) {
  switch (event) {
    case ARDUINO_EVENT_WIFI_STA_CONNECTED:
      Serial.println("WiFi connected to AP");
      break;
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      Serial.print("WiFi got IP: ");
      Serial.println(WiFi.localIP());
      setLed(LED_OK, true);
      setLed(LED_ERR, false);
      currentWifiBackoffMs = WIFI_RECONNECT_BASE_MS; // reset backoff on success
      break;
    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
      Serial.println("WiFi disconnected");
      setLed(LED_OK, false);
      setLed(LED_ERR, true);
      WiFi.reconnect();
      break;
    default:
      break;
  }
}

void connectWiFi() {
  WiFi.persistent(false); // avoid flash writes
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  static bool eventRegistered = false;
  if (!eventRegistered) {
    WiFi.onEvent(onWiFiEvent);
    eventRegistered = true;
  }
  Serial.print("Connecting to WiFi SSID: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void ensureWiFiConnected() {
  if (WiFi.status() == WL_CONNECTED) return;
  unsigned long now = millis();
  if (now - lastWifiAttemptMs >= currentWifiBackoffMs) {
    lastWifiAttemptMs = now;
    Serial.println("Attempting WiFi reconnect...");
    WiFi.disconnect(true);
    delay(100);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    // Exponential backoff with cap
    currentWifiBackoffMs = currentWifiBackoffMs < WIFI_RECONNECT_MAX_MS
      ? min(WIFI_RECONNECT_MAX_MS, currentWifiBackoffMs << 1)
      : WIFI_RECONNECT_MAX_MS;
    blink(LED_ERR, 1, 120);
  }
}

bool checkServiceHealth() {
  String url = String(GATEWAY_HOST) + String(IOT_HEALTH_PATH);
  return httpGet(url);
}

void setup() {
  pinMode(LED_OK, OUTPUT);
  pinMode(LED_TX, OUTPUT);
  pinMode(LED_ERR, OUTPUT);
  setLed(LED_OK, false);
  setLed(LED_TX, false);
  setLed(LED_ERR, false);

  Serial.begin(115200);
  delay(1000);
  Serial.println("PharmaTrust IoT - ESP32 DHT22");

  dht.begin();
  connectWiFi();

  // Optional: initial service health check
  if (WiFi.status() == WL_CONNECTED) {
    bool ok = checkServiceHealth();
    if (!ok) {
      Serial.println("IoT service health check failed");
      blink(LED_ERR, 2, 200);
    } else {
      Serial.println("IoT service reachable");
    }
  }
}

void loop() {
  // Reconnect WiFi if needed
  ensureWiFiConnected();

  unsigned long now = millis();
  if (now - lastPostMs >= POST_INTERVAL_MS) {
    lastPostMs = now;

    float h = dht.readHumidity();
    float t = dht.readTemperature(); // Celsius

    if (!isReadingValid(t, h)) {
      Serial.println("Invalid sensor reading; skipping post");
      blink(LED_ERR, 1, 150);
      return;
    }

    // Build URL
    String url = String(GATEWAY_HOST) + String(IOT_POST_PATH);

    bool success = false;
    for (int attempt = 0; attempt < MAX_RETRIES && !success; attempt++) {
      setLed(LED_TX, true);
      success = postReading(url, DEFAULT_BATCH_ID, t, h);
      setLed(LED_TX, false);

      if (!success) {
        Serial.print("Post failed, attempt ");
        Serial.println(attempt + 1);
        blink(LED_ERR, 1, 100);
        unsigned long backoff = RETRY_BACKOFF_MS << attempt; // 2^attempt * base
        delay(backoff);
      }
    }

    if (success) {
      Serial.print("Posted reading: T=");
      Serial.print(t);
      Serial.print("C H=");
      Serial.print(h);
      Serial.println("%");
      blink(LED_OK, 1, 80);
    } else {
      Serial.println("Failed to post after retries");
      blink(LED_ERR, 2, 120);
    }
  }

  delay(50);
}


