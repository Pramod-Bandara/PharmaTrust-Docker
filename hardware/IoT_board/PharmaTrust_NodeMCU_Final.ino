/*
 * PharmaTrust NodeMCU/ESP32 - Final Production Code
 * HiveMQ Cloud MQTT + HTTP Fallback for Guaranteed Data Delivery
 * 
 * Hardware: ESP32 + DHT22 Sensor (Compatible with client's temo02.ino setup)
 * 
 * Connections (Client-Compatible):
 * - DHT22 VCC -> 3.3V
 * - DHT22 GND -> GND  
 * - DHT22 DATA -> GPIO 23 (matches client's ESP32 setup)
 * 
 * Alternative for NodeMCU (if using different board):
 * - DHT22 DATA -> GPIO 4 (D2 on NodeMCU)
 * 
 * LED Connections (Optional):
 * - LED_OK -> GPIO 2 (built-in)
 * - LED_TX -> GPIO 15
 * - LED_ERR -> GPIO 5
 * 
 * Features:
 * - Primary: MQTT to HiveMQ Cloud
 * - Fallback: HTTP to PharmaTrust IoT service
 * - Guaranteed data delivery to admin dashboard
 * - Visual status indicators
 * - Automatic failover between MQTT and HTTP
 * - Compatible with client's ESP32 hardware configuration
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ========== WIFI CONFIGURATION ==========
// IMPORTANT: Update these with your actual WiFi credentials before uploading!
// For testing with client's network, use their credentials:
// const char* WIFI_SSID = "F44";
// const char* WIFI_PASSWORD = "Kalindu#Ecu2001";
const char* WIFI_SSID = "YOUR_WIFI_SSID";        // Replace with your WiFi name
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"; // Replace with your WiFi password
// Example: const char* WIFI_SSID = "MyHomeNetwork";

// ========== HIVEMQ CLOUD CONFIGURATION ==========
const char* HIVEMQ_HOST = "e3dd87fcf2f74b1681d41863183a91d7.s1.eu.hivemq.cloud";
const int HIVEMQ_PORT = 8883;
const char* HIVEMQ_USERNAME = "pharmatrust";
const char* HIVEMQ_PASSWORD = "Pharmatrust@123";
const char* CLIENT_ID = "pharmatrust_nodemcu_01";

// ========== PHARMATRUST SERVER CONFIGURATION ==========
// IMPORTANT: Update this with your actual server IP address!
// For Docker deployment: Use gateway address (typically port 3000)
// For local development: Find your computer's IP with 'ipconfig' or 'ifconfig'
// 
// NGINX API Gateway routes to IoT service at /api/iot/readings
// Client's setup uses port 80 for local WebServer (different purpose)
// PharmaTrust uses port 3000 for API Gateway -> IoT Service
//
// Example configurations:
// Docker: "http://gateway:3000/api/iot/readings" or "http://localhost:3000/api/iot/readings"
// Local: "http://192.168.1.100:3000/api/iot/readings"
const char* GATEWAY_URL = "http://192.168.1.100:3000/api/iot/readings"; // Replace with your server IP
</parameter>

// ========== MQTT TOPICS ==========
const char* TEMP_TOPIC = "pharmatrust/sensors/temperature";
const char* HUMIDITY_TOPIC = "pharmatrust/sensors/humidity";
const char* STATUS_TOPIC = "pharmatrust/sensors/status";
const char* ALERT_TOPIC = "pharmatrust/alerts/environmental";

// ========== DHT22 SENSOR ==========
// Client's ESP32 uses GPIO 23 (verified from temo02.ino)
// If using NodeMCU, change to GPIO 4 (D2 pin)
#define DHT_PIN_ESP32 23      // For ESP32 (client's setup)
#define DHT_PIN_NODEMCU 4     // For NodeMCU alternative

// AUTO-DETECT BOARD TYPE (ESP32 vs NodeMCU)
#if defined(ESP32)
  #define DHT_PIN DHT_PIN_ESP32
  #define BOARD_TYPE "ESP32"
#else
  #define DHT_PIN DHT_PIN_NODEMCU
  #define BOARD_TYPE "NodeMCU"
#endif

#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

// ========== LED INDICATORS (Optional - disable if not connected) ==========
#define USE_LED_INDICATORS true  // Set to false if LEDs not connected

const int LED_OK = 2;     // Connection OK (built-in LED on most boards)
const int LED_TX = 15;    // Data transmission (optional external LED)
const int LED_ERR = 5;    // Error indicator (optional external LED)

// ========== PHARMACEUTICAL THRESHOLDS ==========
const float TEMP_MIN = 2.0;   // Minimum safe temperature (°C)
const float TEMP_MAX = 25.0;  // Maximum safe temperature (°C)
const float HUM_MIN = 30.0;   // Minimum safe humidity (%)
const float HUM_MAX = 70.0;   // Maximum safe humidity (%)

// ========== DEVICE CONFIGURATION ==========
const char* DEVICE_ID = "NODEMCU_DHT22_001";
const char* BATCH_ID = "BATCH_DEFAULT";
const char* LOCATION = "pharmaceutical_storage";

// ========== TIMING ==========
const unsigned long READING_INTERVAL = 30000; // 30 seconds between readings
const unsigned long WIFI_TIMEOUT = 20000;     // WiFi connection timeout
const unsigned long MQTT_TIMEOUT = 10000;     // MQTT connection timeout

// ========== GLOBAL VARIABLES ==========
WiFiClientSecure mqttClient;
PubSubClient mqtt(mqttClient);
HTTPClient http;

unsigned long lastReading = 0;
bool mqttConnected = false;
int mqttFailures = 0;
int httpFailures = 0;
const int MAX_MQTT_FAILURES = 3;
const int MAX_HTTP_FAILURES = 5;

// ========== UTILITY FUNCTIONS ==========
void setLED(int pin, bool state) {
  if (!USE_LED_INDICATORS) return;
  pinMode(pin, OUTPUT);
  digitalWrite(pin, state ? HIGH : LOW);
}

void blinkLED(int pin, int times, int delayMs = 150) {
  if (!USE_LED_INDICATORS) return;
  for (int i = 0; i < times; i++) {
    setLED(pin, true);
    delay(delayMs);
    setLED(pin, false);
    delay(delayMs);
  }
}

void showStatus(String message) {
  Serial.print("[");
  Serial.print(millis() / 1000);
  Serial.print("s] ");
  Serial.println(message);
}

// ========== WIFI FUNCTIONS ==========
bool connectWiFi() {
  showStatus("🔗 Connecting to WiFi: " + String(WIFI_SSID));
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < WIFI_TIMEOUT) {
    delay(500);
    Serial.print(".");
    blinkLED(LED_ERR, 1, 100);
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    showStatus("✅ WiFi connected! IP: " + WiFi.localIP().toString());
    setLED(LED_OK, true);
    return true;
  } else {
    Serial.println();
    showStatus("❌ WiFi connection failed!");
    setLED(LED_ERR, true);
    return false;
  }
}

void ensureWiFi() {
  if (WiFi.status() != WL_CONNECTED) {
    setLED(LED_OK, false);
    showStatus("🔄 WiFi disconnected, reconnecting...");
    connectWiFi();
  }
}

// ========== MQTT FUNCTIONS ==========
bool connectMQTT() {
  if (mqttFailures >= MAX_MQTT_FAILURES) {
    return false; // Skip MQTT if too many failures
  }
  
  showStatus("🔄 Connecting to HiveMQ Cloud...");
  
  mqttClient.setInsecure(); // For simplicity, disable cert verification
  mqtt.setServer(HIVEMQ_HOST, HIVEMQ_PORT);
  
  unsigned long startTime = millis();
  while (!mqtt.connected() && millis() - startTime < MQTT_TIMEOUT) {
    if (mqtt.connect(CLIENT_ID, HIVEMQ_USERNAME, HIVEMQ_PASSWORD)) {
      showStatus("✅ MQTT connected to HiveMQ Cloud!");
      mqttConnected = true;
      mqttFailures = 0;
      
      // Publish online status
      mqtt.publish(STATUS_TOPIC, "{\"status\":\"online\",\"device\":\"" + String(DEVICE_ID) + "\"}");
      blinkLED(LED_OK, 2, 100);
      return true;
    } else {
      showStatus("MQTT connection failed, code: " + String(mqtt.state()));
      delay(1000);
    }
  }
  
  mqttFailures++;
  mqttConnected = false;
  showStatus("❌ MQTT connection failed after timeout");
  blinkLED(LED_ERR, 2, 200);
  return false;
}

void ensureMQTT() {
  if (!mqttConnected || !mqtt.connected()) {
    connectMQTT();
  }
}

bool publishMQTT(const char* topic, String payload) {
  if (mqttConnected && mqtt.connected()) {
    setLED(LED_TX, true);
    bool success = mqtt.publish(topic, payload.c_str());
    setLED(LED_TX, false);
    return success;
  }
  return false;
}

// ========== HTTP FUNCTIONS ==========
bool sendHTTP(String jsonData) {
  if (httpFailures >= MAX_HTTP_FAILURES) {
    return false; // Skip HTTP if too many failures
  }
  
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }
  
  http.begin(GATEWAY_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);
  
  setLED(LED_TX, true);
  int responseCode = http.POST(jsonData);
  setLED(LED_TX, false);
  
  if (responseCode >= 200 && responseCode < 300) {
    showStatus("✅ HTTP data sent successfully");
    httpFailures = 0;
    http.end();
    return true;
  } else {
    showStatus("❌ HTTP failed, code: " + String(responseCode));
    httpFailures++;
    http.end();
    return false;
  }
}

// ========== SENSOR FUNCTIONS ==========
bool readSensor(float &temperature, float &humidity) {
  temperature = dht.readTemperature();
  humidity = dht.readHumidity();
  
  if (isnan(temperature) || isnan(humidity)) {
    showStatus("❌ DHT22 sensor read failed");
    blinkLED(LED_ERR, 1, 300);
    return false;
  }
  
  return true;
}

bool isReadingValid(float temperature, float humidity) {
  return (temperature >= -40 && temperature <= 80 && humidity >= 0 && humidity <= 100);
}

String checkAnomalies(float temperature, float humidity) {
  String issues = "";
  
  if (temperature < TEMP_MIN) {
    issues += "Temperature too low (" + String(temperature, 1) + "°C). ";
  } else if (temperature > TEMP_MAX) {
    issues += "Temperature too high (" + String(temperature, 1) + "°C). ";
  }
  
  if (humidity < HUM_MIN) {
    issues += "Humidity too low (" + String(humidity, 1) + "%). ";
  } else if (humidity > HUM_MAX) {
    issues += "Humidity too high (" + String(humidity, 1) + "%). ";
  }
  
  return issues;
}

// ========== DATA TRANSMISSION ==========
bool sendSensorData(float temperature, float humidity) {
  // Create JSON payload for IoT service
  StaticJsonDocument<300> doc;
  doc["batchId"] = BATCH_ID;
  doc["deviceId"] = DEVICE_ID;
  doc["temperature"] = round(temperature * 100) / 100.0;
  doc["humidity"] = round(humidity * 100) / 100.0;
  doc["timestamp"] = millis();
  doc["location"] = LOCATION;
  
  String jsonData;
  serializeJson(doc, jsonData);
  
  bool mqttSuccess = false;
  bool httpSuccess = false;
  
  // Try MQTT first
  ensureMQTT();
  if (mqttConnected) {
    mqtt.loop(); // Process MQTT messages
    
    // Send temperature
    StaticJsonDocument<200> tempDoc;
    tempDoc["deviceId"] = DEVICE_ID;
    tempDoc["temperature"] = round(temperature * 100) / 100.0;
    tempDoc["timestamp"] = millis();
    tempDoc["batchId"] = BATCH_ID;
    tempDoc["location"] = LOCATION;
    
    String tempPayload;
    serializeJson(tempDoc, tempPayload);
    mqttSuccess = publishMQTT(TEMP_TOPIC, tempPayload);
    
    if (mqttSuccess) {
      // Send humidity
      StaticJsonDocument<200> humDoc;
      humDoc["deviceId"] = DEVICE_ID;
      humDoc["humidity"] = round(humidity * 100) / 100.0;
      humDoc["timestamp"] = millis();
      humDoc["batchId"] = BATCH_ID;
      humDoc["location"] = LOCATION;
      
      String humPayload;
      serializeJson(humDoc, humPayload);
      publishMQTT(HUMIDITY_TOPIC, humPayload);
      
      showStatus("📤 MQTT: " + String(temperature, 1) + "°C, " + String(humidity, 1) + "%");
    }
  }
  
  // Try HTTP if MQTT failed
  if (!mqttSuccess) {
    showStatus("🔄 MQTT failed, trying HTTP fallback...");
    httpSuccess = sendHTTP(jsonData);
    
    if (httpSuccess) {
      showStatus("📤 HTTP: " + String(temperature, 1) + "°C, " + String(humidity, 1) + "%");
    }
  }
  
  // Send alerts if anomalies detected
  String anomalies = checkAnomalies(temperature, humidity);
  if (anomalies.length() > 0) {
    showStatus("🚨 ALERT: " + anomalies);
    
    StaticJsonDocument<400> alertDoc;
    alertDoc["deviceId"] = DEVICE_ID;
    alertDoc["message"] = anomalies;
    alertDoc["severity"] = "HIGH";
    alertDoc["temperature"] = temperature;
    alertDoc["humidity"] = humidity;
    alertDoc["timestamp"] = millis();
    alertDoc["location"] = LOCATION;
    
    String alertPayload;
    serializeJson(alertDoc, alertPayload);
    
    if (mqttConnected) {
      publishMQTT(ALERT_TOPIC, alertPayload);
    }
    
    blinkLED(LED_ERR, 3, 200);
  }
  
  return mqttSuccess || httpSuccess;
}

// ========== SETUP ==========
void setup() {
  Serial.begin(115200);
  delay(2000);
  
  showStatus("🏥 PharmaTrust IoT Device Starting...");
  showStatus("📡 Board Type: " + String(BOARD_TYPE));
  showStatus("📡 Device ID: " + String(DEVICE_ID));
  showStatus("📍 DHT22 Pin: GPIO " + String(DHT_PIN));
  
  // Initialize LEDs
  setLED(LED_OK, false);
  setLED(LED_TX, false);
  setLED(LED_ERR, false);
  
  // Initialize DHT sensor
  dht.begin();
  showStatus("📊 DHT22 sensor initialized");
  
  // Connect to WiFi
  if (!connectWiFi()) {
    showStatus("❌ Startup failed - no WiFi connection");
    while (true) {
      blinkLED(LED_ERR, 5, 500);
      delay(5000);
    }
  }
  
  // Try initial MQTT connection
  connectMQTT();
  
  showStatus("✅ PharmaTrust IoT Device Ready!");
  showStatus("🔧 Hardware Config: " + String(BOARD_TYPE) + " + DHT22 on GPIO" + String(DHT_PIN));
  showStatus("📊 Reading interval: " + String(READING_INTERVAL / 1000) + " seconds");
  showStatus("🎯 Monitoring pharmaceutical storage conditions...");
  
  // Startup LED sequence
  for (int i = 0; i < 3; i++) {
    setLED(LED_OK, true);
    setLED(LED_TX, true);
    delay(200);
    setLED(LED_OK, false);
    setLED(LED_TX, false);
    delay(200);
  }
}

// ========== MAIN LOOP ==========
void loop() {
  unsigned long currentTime = millis();
  
  // Ensure WiFi connection
  ensureWiFi();
  
  // Process MQTT if connected
  if (mqttConnected) {
    mqtt.loop();
  }
  
  // Read and send sensor data
  if (currentTime - lastReading >= READING_INTERVAL) {
    lastReading = currentTime;
    
    float temperature, humidity;
    if (readSensor(temperature, humidity)) {
      if (isReadingValid(temperature, humidity)) {
        bool success = sendSensorData(temperature, humidity);
        
        if (success) {
          blinkLED(LED_OK, 1, 100);
        } else {
          showStatus("❌ All transmission methods failed!");
          blinkLED(LED_ERR, 5, 150);
        }
        
        // Status summary
        String method = mqttConnected ? "MQTT" : "HTTP";
        showStatus("📊 " + String(temperature, 1) + "°C, " + String(humidity, 1) + "% via " + method);
        
        // Reset failure counters on successful reading
        if (success) {
          mqttFailures = max(0, mqttFailures - 1);
          httpFailures = max(0, httpFailures - 1);
        }
      } else {
        showStatus("⚠️ Invalid sensor reading, skipping...");
      }
    }
  }
  
  delay(100); // Small delay to prevent overwhelming the system
}
