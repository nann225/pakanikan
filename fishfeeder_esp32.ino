#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <time.h>

// ================= KONFIGURASI WiFi =================
const char* ssid     = "Redmi 12";
const char* password = "11111111";

// ================= KONFIGURASI MQTT =================
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;
const char* mqtt_client_id = "fishfeeder-esp32-device-1";
String device_id = "";  // Will be set to MAC address in setup()

// MQTT Topics (will be built dynamically)
String topic_status = "";
String topic_command = "";
String topic_sensor = "";
String topic_feeding = "";

// ================= PIN KONFIGURASI =================
const int PIN_MOTOR = 2;      // Pin relay/servo motor
const int PIN_DHT = 4;        // Pin sensor DHT22
const int PIN_BATTERY = 35;   // Pin ADC untuk battery

// DHT Sensor Setup
#define DHTTYPE DHT22
DHT dht(PIN_DHT, DHTTYPE);

// ================= GLOBAL VARIABLES =================
WiFiClient espClient;
PubSubClient client(espClient);
unsigned long lastSensorUpdate = 0;
unsigned long lastStatusUpdate = 0;
const unsigned long sensorInterval = 10000;  // 10 detik
const unsigned long statusInterval = 5000;   // 5 detik
bool motorRunning = false;
unsigned long motorStartTime = 0;
int motorDuration = 0;

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Get device ID from MAC address
  device_id = getMacAddress();
  Serial.print("Device ID (MAC Address): ");
  Serial.println(device_id);
  
  // Setup MQTT topics dengan device ID yang unik
  topic_status = "fishfeeder/device/" + device_id + "/status";
  topic_command = "fishfeeder/device/" + device_id + "/command";
  topic_sensor = "fishfeeder/device/" + device_id + "/sensors";
  topic_feeding = "fishfeeder/device/" + device_id + "/feeding";
  
  Serial.print("Status Topic: ");
  Serial.println(topic_status);
  
  // Setup pins
  pinMode(PIN_MOTOR, OUTPUT);
  digitalWrite(PIN_MOTOR, LOW);
  
  // Setup DHT sensor
  dht.begin();
  
  // Setup WiFi
  setupWiFi();
  
  // Setup MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  
  // Sync time untuk publish timestamp yang akurat
  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");
  
  Serial.println("Setup selesai!");
}

// ================= SETUP WiFi =================
void setupWiFi() {
  delay(10);
  Serial.println("\n");
  Serial.print("Menghubungkan ke WiFi SSID: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Terhubung!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nGagal terhubung ke WiFi!");
  }
}

// ================= GET MAC ADDRESS =================
String getMacAddress() {
  // Gunakan WiFi.macAddress() yang built-in (format: AA:BB:CC:DD:EE:FF)
  String macAddr = WiFi.macAddress();
  // Hapus colon jika diperlukan (opsional)
  return macAddr;
}

// ================= MQTT RECONNECT =================
void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Mencoba menghubungkan ke MQTT...");
    
    if (client.connect(mqtt_client_id)) {
      Serial.println("Terhubung ke MQTT!");
      
      // Subscribe ke command topic
      client.subscribe(topic_command.c_str());
      Serial.print("Subscribe ke: ");
      Serial.println(topic_command);
      
      // Publish status online
      publishStatus("online");
    } else {
      Serial.print("Gagal, rc=");
      Serial.print(client.state());
      Serial.println(" coba lagi dalam 5 detik...");
      delay(5000);
    }
  }
}

// ================= MQTT CALLBACK (Terima Perintah) =================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.print("Pesan dari topic: ");
  Serial.print(topic);
  Serial.print(" => ");
  Serial.println(message);

  // Parse JSON dari perintah
  DynamicJsonDocument doc(256);
  DeserializationError error = deserializeJson(doc, message);

  if (!error) {
    if (doc.containsKey("action")) {
      String action = doc["action"];
      
      if (action == "feed") {
        int duration = doc["duration"] | 5;  // Default 5 detik jika tidak ada
        Serial.print("Perintah Feed diterima - Durasi: ");
        Serial.print(duration);
        Serial.println(" detik");
        
        feedMotor(duration);
        publishFeedingRecord(duration, "manual");
      }
      else if (action == "stop") {
        Serial.println("Perintah Stop diterima");
        stopMotor();
      }
      else if (action == "test") {
        Serial.println("Perintah Test diterima");
        feedMotor(2);
      }
    }
  } else {
    Serial.print("Error parsing JSON: ");
    Serial.println(error.c_str());
  }
}

// ================= KONTROL MOTOR =================
void feedMotor(int durationSeconds) {
  if (!motorRunning) {
    motorRunning = true;
    motorStartTime = millis();
    motorDuration = durationSeconds;
    digitalWrite(PIN_MOTOR, HIGH);
    Serial.println("Motor HIDUP");
    publishStatus("running");
  }
}

void stopMotor() {
  if (motorRunning) {
    motorRunning = false;
    digitalWrite(PIN_MOTOR, LOW);
    Serial.println("Motor MATI");
    publishStatus("idle");
  }
}

// ================= PUBLISH STATUS KE MQTT =================
void publishStatus(String status) {
  DynamicJsonDocument doc(512);
  doc["device_id"] = device_id;
  doc["status"] = status;
  doc["motor_status"] = motorRunning ? "running" : "idle";
  doc["battery_level"] = getBatteryLevel();
  doc["timestamp"] = getTimestamp();
  doc["signal_strength"] = WiFi.RSSI();

  String payload;
  serializeJson(doc, payload);
  
  client.publish(topic_status.c_str(), payload.c_str());
  Serial.print("Published status: ");
  Serial.println(payload);
}

// ================= PUBLISH SENSOR DATA =================
void publishSensorData() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Gagal membaca sensor DHT22!");
    return;
  }

  DynamicJsonDocument doc(256);
  doc["device_id"] = device_id;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["timestamp"] = getTimestamp();

  String payload;
  serializeJson(doc, payload);
  
  client.publish(topic_sensor.c_str(), payload.c_str());
  Serial.print("Published sensor: ");
  Serial.println(payload);
}

// ================= PUBLISH FEEDING RECORD =================
void publishFeedingRecord(int duration, String feedType) {
  DynamicJsonDocument doc(256);
  doc["device_id"] = device_id;
  doc["duration"] = duration;
  doc["type"] = feedType;
  doc["timestamp"] = getTimestamp();

  String payload;
  serializeJson(doc, payload);
  
  client.publish(topic_feeding.c_str(), payload.c_str());
  Serial.print("Published feeding record: ");
  Serial.println(payload);
}

// ================= GET BATTERY LEVEL =================
int getBatteryLevel() {
  int rawValue = analogRead(PIN_BATTERY);
  // Konversi ADC ke persentase (0-100%)
  // Asumsikan: 0V = 0%, 3.3V = 100% dengan voltage divider
  int percentage = map(rawValue, 0, 4095, 0, 100);
  return constrain(percentage, 0, 100);
}

// ================= GET TIMESTAMP =================
String getTimestamp() {
  time_t now = time(nullptr);
  struct tm* timeinfo = localtime(&now);
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", timeinfo);
  return String(buffer);
}

// ================= MAIN LOOP =================
void loop() {
  // Pastikan WiFi dan MQTT tetap terhubung
  if (WiFi.status() != WL_CONNECTED) {
    setupWiFi();
  }

  if (!client.connected()) {
    reconnectMQTT();
  }

  client.loop();

  // Update motor jika sedang berjalan
  if (motorRunning) {
    unsigned long elapsedTime = (millis() - motorStartTime) / 1000;
    if (elapsedTime >= motorDuration) {
      stopMotor();
    }
  }

  // Publish sensor data secara berkala
  if (millis() - lastSensorUpdate >= sensorInterval) {
    publishSensorData();
    lastSensorUpdate = millis();
  }

  // Publish status secara berkala
  if (millis() - lastStatusUpdate >= statusInterval) {
    publishStatus(motorRunning ? "running" : "idle");
    lastStatusUpdate = millis();
  }

  delay(100);
}