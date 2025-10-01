/*
 * PharmaTrust IoT Sensor with MQTT
 * Pharmaceutical Environmental Monitoring System
 * 
 * This Arduino sketch reads DHT22 sensor data and publishes it via MQTT
 * to the PharmaTrust system for real-time pharmaceutical monitoring.
 * 
 * Hardware Requirements:
 * - ESP32 or Arduino with WiFi capability
 * - DHT22 temperature/humidity sensor
 * - Connecting wires
 * 
 * Connections:
 * - DHT22 VCC -> 3.3V
 * - DHT22 GND -> GND  
 * - DHT22 DATA -> GPIO 4
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ========== CONFIGURATION ==========
// WiFi credentials - UPDATE THESE!
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Broker settings - UPDATE IP ADDRESS!
const char* mqtt_server = "192.168.1.100";  // Your PharmaTrust server IP
const int mqtt_port = 1883;
const char* mqtt_client_id = "pharmatrust_sensor_01";

// MQTT Topics for PharmaTrust
const char* temp_topic = "pharmatrust/sensors/temperature";
const char* humidity_topic = "pharmatrust/sensors/humidity";
const char* status_topic = "pharmatrust/sensors/status";
const char* alert_topic = "pharmatrust/alerts/environmental";

// DHT22 sensor configuration
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// Pharmaceutical storage thresholds (°C and %)
const float TEMP_MIN = 2.0;   // Minimum safe temperature
const float TEMP_MAX = 25.0;  // Maximum safe temperature  
const float HUM_MIN = 30.0;   // Minimum safe humidity
const float HUM_MAX = 70.0;   // Maximum safe humidity

// ========== GLOBAL VARIABLES ==========
WiFiClient espClient;
PubSubClient client(espClient);

// Timing variables
unsigned long lastMsg = 0;
const long interval = 30000; // 30 seconds between readings

// Sensor reading variables
float temperature = 0.0;
float humidity = 0.0;
int consecutiveFailures = 0;
const int maxFailures = 5;

// ========== SETUP FUNCTION ==========
void setup() {
  Serial.begin(115200);
  Serial.println("\n🏥 PharmaTrust IoT Sensor Starting...");
  
  // Initialize DHT sensor
  dht.begin();
  Serial.println("📡 DHT22 sensor initialized");
  
  // Connect to WiFi
  setup_wifi();
  
  // Configure MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  
  Serial.println("✅ PharmaTrust IoT Sensor Ready!");
  Serial.println("📊 Monitoring pharmaceutical storage conditions...");
}

// ========== WIFI SETUP ==========
void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("🔗 Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("✅ WiFi connected successfully!");
  Serial.print("📍 IP address: ");
  Serial.println(WiFi.localIP());
}

// ========== MQTT CALLBACK ==========
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("📨 Message received [");
  Serial.print(topic);
  Serial.print("]: ");
  
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);
  
  // Handle remote commands (future enhancement)
  if (String(topic) == "pharmatrust/commands/calibrate") {
    Serial.println("🔧 Calibration command received");
    // Add calibration logic here
  }
}

// ========== MQTT RECONNECTION ==========
void reconnect() {
  while (!client.connected()) {
    Serial.print("🔄 Attempting MQTT connection...");
    
    if (client.connect(mqtt_client_id)) {
      Serial.println(" connected!");
      
      // Publish startup message
      publishStatus("PharmaTrust sensor online - monitoring pharmaceutical storage");
      
      // Subscribe to command topics (optional)
      client.subscribe("pharmatrust/commands/+");
      
    } else {
      Serial.print(" failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying in 5 seconds");
      delay(5000);
    }
  }
}

// ========== SENSOR READING ==========
bool readSensors() {
  temperature = dht.readTemperature();
  humidity = dht.readHumidity();
  
  // Check if readings are valid
  if (isnan(temperature) || isnan(humidity)) {
    consecutiveFailures++;
    Serial.println("❌ Failed to read from DHT sensor!");
    
    if (consecutiveFailures >= maxFailures) {
      publishStatus("ALERT: Sensor failure - multiple consecutive read failures");
      consecutiveFailures = 0; // Reset to avoid spam
    }
    
    return false;
  }
  
  consecutiveFailures = 0; // Reset failure counter
  return true;
}

// ========== ANOMALY DETECTION ==========
String checkAnomalies() {
  String anomalies = "";
  
  // Temperature checks
  if (temperature < TEMP_MIN) {
    anomalies += "CRITICAL: Temperature too low (" + String(temperature, 1) + "°C < " + String(TEMP_MIN, 1) + "°C). ";
  } else if (temperature > TEMP_MAX) {
    anomalies += "CRITICAL: Temperature too high (" + String(temperature, 1) + "°C > " + String(TEMP_MAX, 1) + "°C). ";
  }
  
  // Humidity checks  
  if (humidity < HUM_MIN) {
    anomalies += "WARNING: Humidity too low (" + String(humidity, 1) + "% < " + String(HUM_MIN, 1) + "%). ";
  } else if (humidity > HUM_MAX) {
    anomalies += "WARNING: Humidity too high (" + String(humidity, 1) + "% > " + String(HUM_MAX, 1) + "%). ";
  }
  
  return anomalies;
}

// ========== MQTT PUBLISHING FUNCTIONS ==========
void publishTemperature() {
  StaticJsonDocument<300> doc;
  doc["deviceId"] = mqtt_client_id;
  doc["timestamp"] = millis();
  doc["location"] = "storage_room_1";
  doc["batchId"] = "AUTO_DETECT";
  doc["temperature"] = round(temperature * 100) / 100.0; // Round to 2 decimal places
  doc["unit"] = "celsius";
  
  String payload;
  serializeJson(doc, payload);
  
  if (client.publish(temp_topic, payload.c_str())) {
    Serial.print("📤 Temperature published: ");
    Serial.print(temperature, 1);
    Serial.println("°C");
  } else {
    Serial.println("❌ Failed to publish temperature");
  }
}

void publishHumidity() {
  StaticJsonDocument<300> doc;
  doc["deviceId"] = mqtt_client_id;
  doc["timestamp"] = millis();
  doc["location"] = "storage_room_1";
  doc["batchId"] = "AUTO_DETECT";
  doc["humidity"] = round(humidity * 100) / 100.0; // Round to 2 decimal places
  doc["unit"] = "percent";
  
  String payload;
  serializeJson(doc, payload);
  
  if (client.publish(humidity_topic, payload.c_str())) {
    Serial.print("📤 Humidity published: ");
    Serial.print(humidity, 1);
    Serial.println("%");
  } else {
    Serial.println("❌ Failed to publish humidity");
  }
}

void publishAlert(String message) {
  StaticJsonDocument<400> doc;
  doc["deviceId"] = mqtt_client_id;
  doc["timestamp"] = millis();
  doc["location"] = "storage_room_1";
  doc["severity"] = "HIGH";
  doc["message"] = message;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  
  String payload;
  serializeJson(doc, payload);
  
  if (client.publish(alert_topic, payload.c_str())) {
    Serial.print("🚨 ALERT published: ");
    Serial.println(message);
  }
}

void publishStatus(String message) {
  StaticJsonDocument<200> doc;
  doc["deviceId"] = mqtt_client_id;
  doc["timestamp"] = millis();
  doc["status"] = message;
  doc["uptime"] = millis() / 1000;
  
  String payload;
  serializeJson(doc, payload);
  
  client.publish(status_topic, payload.c_str());
}

// ========== MAIN LOOP ==========
void loop() {
  // Ensure MQTT connection
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Check if it's time for a new reading
  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;
    
    // Read sensors
    if (readSensors()) {
      // Publish sensor data
      publishTemperature();
      publishHumidity();
      
      // Check for anomalies
      String anomalies = checkAnomalies();
      if (anomalies.length() > 0) {
        publishAlert(anomalies);
        Serial.println("🚨 " + anomalies);
      } else {
        Serial.println("✅ Environmental conditions normal");
      }
      
      // Status summary
      Serial.println("📊 Current conditions: " + String(temperature, 1) + "°C, " + String(humidity, 1) + "%");
      Serial.println("---");
      
    } else {
      Serial.println("⚠️ Sensor reading failed, skipping this cycle");
    }
  }
  
  // Small delay to prevent overwhelming the system
  delay(100);
}
