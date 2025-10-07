/*
 * PharmaTrust Arduino Uno - Final Production Code  
 * USB Serial to Computer Bridge for PharmaTrust System
 * 
 * Hardware: Arduino Uno + DHT22 Sensor
 * 
 * Connections:
 * - DHT22 VCC -> 5V
 * - DHT22 GND -> GND
 * - DHT22 DATA -> Digital Pin 4
 * - LED_OK -> Digital Pin 13 (built-in LED)
 * - LED_TX -> Digital Pin 12
 * - LED_ERR -> Digital Pin 11
 * 
 * Features:
 * - Reads DHT22 sensor data every 30 seconds
 * - Sends JSON data via USB Serial to computer
 * - Computer runs Node.js forwarder script to send to PharmaTrust
 * - Visual status indicators
 * - Pharmaceutical anomaly detection
 * - No WiFi required - uses computer's internet connection
 * 
 * Usage:
 * 1. Upload this code to Arduino Uno
 * 2. Run: node scripts/arduino-usb-forwarder.js
 * 3. Data appears on PharmaTrust admin dashboard
 */

#include <DHT.h>

// ========== DHT22 SENSOR CONFIGURATION ==========
#define DHT_PIN 4
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

// ========== LED INDICATORS ==========
const int LED_OK = 13;    // Status OK (built-in LED)
const int LED_TX = 12;    // Data transmission
const int LED_ERR = 11;   // Error indicator

// ========== PHARMACEUTICAL THRESHOLDS ==========
const float TEMP_MIN = 2.0;   // Minimum safe temperature (°C)
const float TEMP_MAX = 25.0;  // Maximum safe temperature (°C)  
const float HUM_MIN = 30.0;   // Minimum safe humidity (%)
const float HUM_MAX = 70.0;   // Maximum safe humidity (%)

// ========== DEVICE CONFIGURATION ==========
const char* DEVICE_ID = "ARDUINO_UNO_DHT22_001";
const char* BATCH_ID = "BATCH_DEFAULT";
const char* LOCATION = "pharmaceutical_storage";

// ========== TIMING ==========
const unsigned long READING_INTERVAL = 30000; // 30 seconds between readings
const unsigned long STARTUP_DELAY = 3000;     // Wait for Serial connection

// ========== GLOBAL VARIABLES ==========
unsigned long lastReading = 0;
unsigned long startTime = 0;
int readingCount = 0;
int errorCount = 0;

// ========== UTILITY FUNCTIONS ==========
void setLED(int pin, bool state) {
  pinMode(pin, OUTPUT);
  digitalWrite(pin, state ? HIGH : LOW);
}

void blinkLED(int pin, int times, int delayMs = 150) {
  for (int i = 0; i < times; i++) {
    setLED(pin, true);
    delay(delayMs);
    setLED(pin, false);
    delay(delayMs);
  }
}

void showStatus(String message) {
  Serial.print(F("{\"type\":\"status\",\"timestamp\":"));
  Serial.print(millis());
  Serial.print(F(",\"message\":\""));
  Serial.print(message);
  Serial.println(F("\"}"));
}

void showError(String error) {
  Serial.print(F("{\"type\":\"error\",\"timestamp\":"));
  Serial.print(millis());
  Serial.print(F(",\"error\":\""));
  Serial.print(error);
  Serial.println(F("\"}"));
  errorCount++;
  blinkLED(LED_ERR, 2, 200);
}

// ========== SENSOR FUNCTIONS ==========
bool readSensor(float &temperature, float &humidity) {
  temperature = dht.readTemperature();
  humidity = dht.readHumidity();
  
  if (isnan(temperature) || isnan(humidity)) {
    showError("DHT22 sensor read failed");
    return false;
  }
  
  return true;
}

bool isReadingValid(float temperature, float humidity) {
  // Basic validation ranges
  if (temperature < -40 || temperature > 80) return false;
  if (humidity < 0 || humidity > 100) return false;
  return true;
}

String checkAnomalies(float temperature, float humidity) {
  String issues = "";
  
  if (temperature < TEMP_MIN) {
    issues += "Temperature too low (" + String(temperature, 1) + "C). ";
  } else if (temperature > TEMP_MAX) {
    issues += "Temperature too high (" + String(temperature, 1) + "C). ";
  }
  
  if (humidity < HUM_MIN) {
    issues += "Humidity too low (" + String(humidity, 1) + "%). ";
  } else if (humidity > HUM_MAX) {
    issues += "Humidity too high (" + String(humidity, 1) + "%). ";
  }
  
  return issues;
}

// ========== DATA TRANSMISSION ==========
void sendSensorData(float temperature, float humidity) {
  setLED(LED_TX, true);
  
  // Send structured JSON data for Node.js forwarder
  Serial.print(F("{\"type\":\"reading\","));
  Serial.print(F("\"batchId\":\""));
  Serial.print(BATCH_ID);
  Serial.print(F("\",\"deviceId\":\""));
  Serial.print(DEVICE_ID);
  Serial.print(F("\",\"temperature\":"));
  Serial.print(temperature, 2);
  Serial.print(F(",\"humidity\":"));
  Serial.print(humidity, 2);
  Serial.print(F(",\"timestamp\":"));
  Serial.print(millis());
  Serial.print(F(",\"location\":\""));
  Serial.print(LOCATION);
  Serial.print(F("\",\"readingNumber\":"));
  Serial.print(readingCount);
  Serial.println(F("}"));
  
  setLED(LED_TX, false);
  readingCount++;
  
  // Check for anomalies and send alert
  String anomalies = checkAnomalies(temperature, humidity);
  if (anomalies.length() > 0) {
    setLED(LED_ERR, true);
    
    // Send alert JSON
    Serial.print(F("{\"type\":\"alert\","));
    Serial.print(F("\"deviceId\":\""));
    Serial.print(DEVICE_ID);
    Serial.print(F("\",\"severity\":\"HIGH\","));
    Serial.print(F("\"message\":\""));
    Serial.print(anomalies);
    Serial.print(F("\",\"temperature\":"));
    Serial.print(temperature, 2);
    Serial.print(F(",\"humidity\":"));
    Serial.print(humidity, 2);
    Serial.print(F(",\"timestamp\":"));
    Serial.print(millis());
    Serial.print(F(",\"location\":\""));
    Serial.print(LOCATION);
    Serial.println(F("}"));
    
    setLED(LED_ERR, false);
    blinkLED(LED_ERR, 3, 150);
  } else {
    blinkLED(LED_OK, 1, 100);
  }
}

void sendHeartbeat() {
  Serial.print(F("{\"type\":\"heartbeat\","));
  Serial.print(F("\"deviceId\":\""));
  Serial.print(DEVICE_ID);
  Serial.print(F("\",\"uptime\":"));
  Serial.print(millis() / 1000);
  Serial.print(F(",\"readings\":"));
  Serial.print(readingCount);
  Serial.print(F(",\"errors\":"));
  Serial.print(errorCount);
  Serial.print(F(",\"freeMemory\":"));
  Serial.print(getFreeMemory());
  Serial.println(F("}"));
}

// Get available memory (useful for debugging)
int getFreeMemory() {
  extern int __heap_start, *__brkval;
  int v;
  return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval);
}

// ========== SETUP ==========
void setup() {
  Serial.begin(115200);
  delay(STARTUP_DELAY); // Allow Serial connection to establish
  
  // Initialize LEDs
  setLED(LED_OK, false);
  setLED(LED_TX, false);
  setLED(LED_ERR, false);
  
  // Initialize DHT sensor
  dht.begin();
  
  // Send startup message
  Serial.println(F("{\"type\":\"startup\",\"device\":\"PharmaTrust Arduino Uno\",\"version\":\"1.0\",\"features\":[\"DHT22\",\"USB_Bridge\",\"Pharmaceutical_Monitoring\"]}"));
  
  showStatus("DHT22 sensor initialized");
  showStatus("PharmaTrust Arduino Uno ready");
  showStatus("Waiting for USB forwarder script...");
  
  startTime = millis();
  
  // Startup LED sequence
  for (int i = 0; i < 3; i++) {
    setLED(LED_OK, true);
    setLED(LED_TX, true);
    setLED(LED_ERR, true);
    delay(200);
    setLED(LED_OK, false);
    setLED(LED_TX, false);
    setLED(LED_ERR, false);
    delay(200);
  }
  
  setLED(LED_OK, true); // Keep status LED on when ready
}

// ========== MAIN LOOP ==========
void loop() {
  unsigned long currentTime = millis();
  
  // Read and send sensor data every interval
  if (currentTime - lastReading >= READING_INTERVAL) {
    lastReading = currentTime;
    
    float temperature, humidity;
    if (readSensor(temperature, humidity)) {
      if (isReadingValid(temperature, humidity)) {
        sendSensorData(temperature, humidity);
        
        // Send status update
        showStatus("Reading " + String(readingCount) + ": " + 
                  String(temperature, 1) + "C, " + 
                  String(humidity, 1) + "%");
      } else {
        showError("Invalid sensor reading: T=" + String(temperature) + 
                 ", H=" + String(humidity));
      }
    }
  }
  
  // Send heartbeat every 5 minutes
  if (currentTime % 300000 == 0 && currentTime > 0) {
    sendHeartbeat();
  }
  
  // Check for commands from USB forwarder (optional)
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "STATUS") {
      sendHeartbeat();
    } else if (command == "READ") {
      // Force immediate reading
      float temperature, humidity;
      if (readSensor(temperature, humidity)) {
        sendSensorData(temperature, humidity);
      }
    } else if (command == "RESET") {
      // Reset counters
      readingCount = 0;
      errorCount = 0;
      startTime = millis();
      showStatus("Counters reset");
    }
  }
  
  delay(100); // Small delay to prevent overwhelming Serial
}
