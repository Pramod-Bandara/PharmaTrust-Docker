# PharmaTrust MQTT Setup Guide

## What is MQTT and Why Use It?

MQTT (Message Queuing Telemetry Transport) is a lightweight messaging protocol perfect for IoT devices. For PharmaTrust, it offers:

- **Reliable messaging**: Messages are guaranteed to be delivered
- **Low bandwidth**: Perfect for Arduino sensors
- **Real-time updates**: Instant data streaming to dashboards
- **Scalability**: Easy to add more sensors
- **Better than HTTP**: No need for Arduino to make HTTP requests

## Quick Overview

```
[Arduino DHT22] → [MQTT Broker] → [PharmaTrust IoT Service] → [Dashboards]
```

Instead of Arduino making HTTP requests, it publishes sensor data to MQTT topics, and our IoT service subscribes to receive the data.

## Step 1: Add MQTT Broker to Docker Setup

Add this to your `docker-compose.yml` file:

```yaml
  mosquitto:
    image: eclipse-mosquitto:2.0
    container_name: pharmatrust-mosquitto
    restart: unless-stopped
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./mqtt/config:/mosquitto/config
      - ./mqtt/data:/mosquitto/data
      - ./mqtt/log:/mosquitto/log
    networks:
      - pharmanet
    healthcheck:
      test: ["CMD", "mosquitto_pub", "-h", "localhost", "-t", "test", "-m", "test"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Step 2: Create MQTT Configuration

Create the MQTT config directory and files:

```bash
mkdir -p mqtt/config mqtt/data mqtt/log
```

Create `mqtt/config/mosquitto.conf`:

```
# Basic MQTT configuration for PharmaTrust
listener 1883
allow_anonymous true
persistence true
persistence_location /mosquitto/data/
log_dest file /mosquitto/log/mosquitto.log
log_type error
log_type warning
log_type notice
log_type information

# WebSocket support (optional, for web clients)
listener 9001
protocol websockets
```

## Step 3: Update Arduino Code

Replace your current Arduino code with this MQTT version:

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Broker settings
const char* mqtt_server = "192.168.1.100";  // Your PharmaTrust server IP
const int mqtt_port = 1883;
const char* mqtt_client_id = "pharmatrust_sensor_01";

// MQTT Topics
const char* temp_topic = "pharmatrust/sensors/temperature";
const char* humidity_topic = "pharmatrust/sensors/humidity";
const char* status_topic = "pharmatrust/sensors/status";

// DHT22 sensor
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// MQTT and WiFi clients
WiFiClient espClient;
PubSubClient client(espClient);

// Timing
unsigned long lastMsg = 0;
const long interval = 30000; // 30 seconds

void setup() {
  Serial.begin(115200);
  dht.begin();
  
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  
  Serial.println("PharmaTrust IoT Sensor Ready!");
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    if (client.connect(mqtt_client_id)) {
      Serial.println("connected");
      // Publish status message
      client.publish(status_topic, "PharmaTrust sensor online");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;
    
    // Read sensor data
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    
    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("Failed to read from DHT sensor!");
      return;
    }
    
    // Create JSON payload
    StaticJsonDocument<200> doc;
    doc["deviceId"] = mqtt_client_id;
    doc["timestamp"] = now;
    doc["location"] = "storage_room_1";
    doc["batchId"] = "AUTO_DETECT"; // IoT service will determine batch
    
    // Publish temperature
    doc["temperature"] = temperature;
    String tempPayload;
    serializeJson(doc, tempPayload);
    client.publish(temp_topic, tempPayload.c_str());
    
    // Publish humidity
    doc.remove("temperature");
    doc["humidity"] = humidity;
    String humPayload;
    serializeJson(doc, humPayload);
    client.publish(humidity_topic, humPayload.c_str());
    
    // Debug output
    Serial.printf("Published - Temp: %.2f°C, Humidity: %.2f%%\n", temperature, humidity);
  }
}
```

## Step 4: Update IoT Service for MQTT

Add MQTT client to your IoT service. Update `services/iot/package.json`:

```json
{
  "dependencies": {
    "mqtt": "^5.0.0",
    // ... existing dependencies
  }
}
```

Create `services/iot/src/mqtt-client.ts`:

```typescript
import mqtt from 'mqtt';
import { processEnvironmentalData } from './controllers/iot-controller';

class MQTTClient {
  private client: mqtt.MqttClient;
  
  constructor() {
    // Connect to MQTT broker
    this.client = mqtt.connect('mqtt://mosquitto:1883');
    
    this.client.on('connect', () => {
      console.log('✅ Connected to MQTT broker');
      
      // Subscribe to PharmaTrust sensor topics
      this.client.subscribe([
        'pharmatrust/sensors/temperature',
        'pharmatrust/sensors/humidity',
        'pharmatrust/sensors/status'
      ]);
    });
    
    this.client.on('message', async (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (topic) {
          case 'pharmatrust/sensors/temperature':
            await this.handleTemperatureData(data);
            break;
          case 'pharmatrust/sensors/humidity':
            await this.handleHumidityData(data);
            break;
          case 'pharmatrust/sensors/status':
            console.log('📡 Sensor status:', message.toString());
            break;
        }
      } catch (error) {
        console.error('❌ Error processing MQTT message:', error);
      }
    });
    
    this.client.on('error', (error) => {
      console.error('❌ MQTT connection error:', error);
    });
  }
  
  private async handleTemperatureData(data: any) {
    const environmentalData = {
      deviceId: data.deviceId,
      temperature: data.temperature,
      humidity: null, // Will be set when humidity message arrives
      timestamp: new Date(data.timestamp),
      location: data.location,
      batchId: data.batchId === 'AUTO_DETECT' ? await this.detectBatch(data.location) : data.batchId
    };
    
    // Store in temporary cache until humidity data arrives
    this.cacheReading(data.deviceId, environmentalData);
  }
  
  private async handleHumidityData(data: any) {
    const cachedReading = this.getCachedReading(data.deviceId);
    
    if (cachedReading) {
      cachedReading.humidity = data.humidity;
      
      // Process complete reading
      await processEnvironmentalData(cachedReading);
      this.clearCachedReading(data.deviceId);
    }
  }
  
  private async detectBatch(location: string): Promise<string> {
    // Logic to determine which batch is in this location
    // For demo, return a default batch
    return 'BATCH_DEFAULT';
  }
  
  // Simple in-memory cache for readings
  private readingCache = new Map();
  
  private cacheReading(deviceId: string, data: any) {
    this.readingCache.set(deviceId, data);
  }
  
  private getCachedReading(deviceId: string) {
    return this.readingCache.get(deviceId);
  }
  
  private clearCachedReading(deviceId: string) {
    this.readingCache.delete(deviceId);
  }
}

export default MQTTClient;
```

Update `services/iot/src/server.ts` to initialize MQTT:

```typescript
import MQTTClient from './mqtt-client';

// ... existing code ...

// Initialize MQTT client
const mqttClient = new MQTTClient();

// ... rest of server code ...
```

## Step 5: Start the System

1. **Update Docker Compose**:
```bash
# Add the mosquitto service to docker-compose.yml
# Then restart
docker-compose down
docker-compose up -d
```

2. **Check MQTT Broker**:
```bash
# Check if MQTT broker is running
docker-compose ps mosquitto

# Test MQTT broker
docker exec -it pharmatrust-mosquitto mosquitto_pub -t "test" -m "hello"
```

3. **Upload Arduino Code**:
   - Update WiFi credentials and server IP
   - Upload to your Arduino/ESP32
   - Check serial monitor for connection status

4. **Monitor MQTT Messages**:
```bash
# Subscribe to all PharmaTrust topics
docker exec -it pharmatrust-mosquitto mosquitto_sub -t "pharmatrust/sensors/+"
```

## Step 6: Test the Setup

1. **Check Arduino Serial Monitor**: Should see "connected" and publishing messages
2. **Check MQTT Logs**: `docker-compose logs mosquitto`
3. **Check IoT Service Logs**: `docker-compose logs iot`
4. **Check Dashboard**: Should see real-time data in supplier/manufacturer dashboards

## MQTT Topics Structure

```
pharmatrust/
├── sensors/
│   ├── temperature      # Temperature readings
│   ├── humidity         # Humidity readings
│   └── status          # Sensor status messages
├── alerts/
│   ├── temperature     # Temperature anomaly alerts
│   └── humidity        # Humidity anomaly alerts
└── system/
    ├── health          # System health messages
    └── commands        # Remote commands to sensors
```

## Benefits of MQTT Setup

✅ **More Reliable**: Messages are guaranteed delivery  
✅ **Better Performance**: Lower latency than HTTP  
✅ **Scalable**: Easy to add more sensors  
✅ **Real-time**: Instant data streaming  
✅ **Professional**: Industry standard for IoT  
✅ **Flexible**: Can add more topics/sensors easily  

## Troubleshooting

**Arduino won't connect to MQTT**:
- Check WiFi credentials
- Verify server IP address
- Check firewall settings

**No data in dashboard**:
- Check IoT service logs: `docker-compose logs iot`
- Verify MQTT broker is running: `docker-compose ps mosquitto`
- Test MQTT manually: `mosquitto_pub -h localhost -t "test" -m "hello"`

**MQTT broker issues**:
- Check mosquitto logs: `docker-compose logs mosquitto`
- Verify config file permissions
- Restart broker: `docker-compose restart mosquitto`

## Next Steps

Once MQTT is working:
1. Add more sensor types (pressure, light, etc.)
2. Implement sensor commands (remote calibration)
3. Add MQTT authentication for production
4. Set up MQTT over TLS for security
5. Add data visualization with real-time MQTT feeds

Your PharmaTrust system now has professional-grade IoT communication! 🚀
