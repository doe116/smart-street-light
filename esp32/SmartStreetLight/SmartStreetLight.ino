
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "Config.h"
#include "secrets.h"
#include "SensorService.h"
#include "TimeService.h"
#include "SupabaseService.h"

// Hardware instances
SensorService sensor1(PIN_TRIG_1, PIN_ECHO_1);
SensorService sensor2(PIN_TRIG_2, PIN_ECHO_2);
TimeService timeService;
SupabaseService supabaseService(SECRET_SUPABASE_URL, SECRET_SUPABASE_KEY);

// System Settings Cache
SystemSettings settings;
TargetState target;

// Device metrics
int localVehicleCount = 0;
bool currentLightState = false;       // false = OFF, true = ON
String currentMode = "auto";
bool isDaytimeState = true;

// Timers and polling bounds
unsigned long lastHeartbeatMs = 0;
unsigned long lastCommandCheckMs = 0;
unsigned long lastSettingsFetchMs = 0;
unsigned long lightOffMs = 0;
unsigned long lastVehicleTriggerMs = 0;

// Bidirectional tracking timestamps
unsigned long s1TriggerTime = 0;
unsigned long s2TriggerTime = 0;
const unsigned long traversalWindowMs = 1500; // Time window to traverse between sensors

// Function Declarations
void connectWiFi();
void checkWiFiConnection();
void fetchSystemSettings();
void pollTargetOverrides();
void executeLightControl();
void processSensors();

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println(F("\n=================================================="));
  Serial.println(F("     IoT Smart Street Light System Starting       "));
  Serial.println(F("==================================================\n"));

  // 1. Initialize PINs
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, LOW);
  pinMode(PIN_LDR, INPUT);

  // 2. Initialize Services
  sensor1.init();
  sensor2.init();
  timeService.init();

  // 3. Connect to WiFi network
  connectWiFi();

  // 4. Synchronize clock with NTP
  timeService.syncWithNTP();

  // 5. Initial fetch of DB configurations
  fetchSystemSettings();

  // 6. Push initial heartbeat report
  supabaseService.uploadHeartbeat(
    WiFi.RSSI(), 
    millis() / 1000, 
    timeService.getISO8601Timestamp()
  );

  Serial.println(F("[SYSTEM] Initialization completed. Main loop active."));
}

void loop() {
  // Guard WiFi connection status
  checkWiFiConnection();

  // 1. Process Ultrasonic Scanners (continual, non-blocking)
  processSensors();

  // 2. Periodically fetch system configuration settings (every 60 seconds)
  if (millis() - lastSettingsFetchMs >= 60000) {
    fetchSystemSettings();
  }

  // 3. Periodically poll target override commands (every pollingIntervalS seconds)
  if (millis() - lastCommandCheckMs >= (settings.pollingIntervalS * 1000)) {
    pollTargetOverrides();
  }

  // 4. Run State Machine to evaluate Light state (continual, non-blocking)
  executeLightControl();

  // 5. Periodically upload heartbeat telemetry (every heartbeatIntervalS seconds)
  if (millis() - lastHeartbeatMs >= (settings.heartbeatIntervalS * 1000)) {
    lastHeartbeatMs = millis();
    supabaseService.uploadHeartbeat(
      WiFi.RSSI(), 
      millis() / 1000, 
      timeService.getISO8601Timestamp()
    );
  }
  
  // Minimal yield to prevent WDT reset
  delay(10);
}

void connectWiFi() {
  Serial.print(F("[WIFI] Connecting to SSID: "));
  Serial.println(SECRET_WIFI_SSID);
  
  WiFi.begin(SECRET_WIFI_SSID, SECRET_WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(F("."));
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\n[WIFI] Connected! IP Address: "));
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(F("\n[WIFI] Failed to connect. Will retry in main loop."));
  }
}

void checkWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[WIFI] Connection lost. Reconnecting..."));
    WiFi.disconnect();
    WiFi.reconnect();
    // Non-blocking wait in case of instant recovery
    int wait = 0;
    while (WiFi.status() != WL_CONNECTED && wait < 6) {
      delay(500);
      wait++;
    }
  }
}

void fetchSystemSettings() {
  lastSettingsFetchMs = millis();
  SystemSettings tempSettings;
  if (supabaseService.fetchSettings(tempSettings)) {
    settings = tempSettings;
    Serial.println(F("[CONFIG] System settings updated from database:"));
    Serial.printf("  - Light ON Duration: %d ms\n", settings.lightOnDurationMs);
    Serial.printf("  - LDR Threshold: %d\n", settings.ldrThresholdDay);
    Serial.printf("  - Sensor Distance: %.1f cm\n", settings.detectionDistanceCm);
    Serial.printf("  - Heartbeat Interval: %d s\n", settings.heartbeatIntervalS);
    Serial.printf("  - Night Start: %s, End: %s\n", settings.nightModeStart.c_str(), settings.nightModeEnd.c_str());
    Serial.printf("  - Polling Rate: %d s\n", settings.pollingIntervalS);
  } else {
    Serial.println(F("[CONFIG] Settings fetch failed. Utilizing local defaults."));
    // Load config fallback defaults
    settings.lightOnDurationMs = DEFAULT_LIGHT_ON_DURATION_MS;
    settings.ldrThresholdDay = DEFAULT_LDR_THRESHOLD_DAY;
    settings.detectionDistanceCm = DEFAULT_DETECTION_DISTANCE_CM;
    settings.heartbeatIntervalS = DEFAULT_HEARTBEAT_INTERVAL_S;
    settings.nightModeStart = DEFAULT_NIGHT_START;
    settings.nightModeEnd = DEFAULT_NIGHT_END;
    settings.pollingIntervalS = DEFAULT_POLLING_INTERVAL_S;
  }
}

void pollTargetOverrides() {
  lastCommandCheckMs = millis();
  TargetState tempTarget;
  if (supabaseService.fetchTargetState(tempTarget)) {
    target = tempTarget;
    currentMode = target.mode;
    
    // If Mode is MANUAL, directly follow database target state overrides
    if (currentMode == "manual") {
      bool targetState = (target.lightStatus == "ON");
      if (targetState != currentLightState) {
        currentLightState = targetState;
        digitalWrite(PIN_LED, currentLightState ? HIGH : LOW);
        Serial.printf("[OVERRIDE] Manual override action executed: Light is now %s\n", currentLightState ? "ON" : "OFF");
        
        // Log back change to light_status
        supabaseService.syncPhysicalLightState(
          currentLightState ? "ON" : "OFF", 
          "manual", 
          isDaytimeState, 
          timeService.getISO8601Timestamp()
        );
      }
    }
  }
}

void processSensors() {
  // Read distance filters
  float d1 = sensor1.readDistanceFiltered();
  float d2 = sensor2.readDistanceFiltered();

  unsigned long now = millis();

  // Track Sensor 1 (Incoming) Triggers
  if (d1 < settings.detectionDistanceCm && d1 > SENSOR_MIN_DISTANCE_CM) {
    if (now - s1TriggerTime > 1500) { // prevent double trigger spikes
      s1TriggerTime = now;
      Serial.printf("[SENSOR] Sensor 1 Triggered! (Distance: %.1f cm)\n", d1);
      
      // Check if Sensor 2 was triggered recently (traversal from Outgoing -> Incoming, e.g. direction2)
      if (now - s2TriggerTime < traversalWindowMs && s2TriggerTime > 0 && (now - lastVehicleTriggerMs > VEHICLE_DETECTION_COOLDOWN_MS)) {
        lastVehicleTriggerMs = now;
        localVehicleCount++;
        Serial.printf("[VEHICLE] Traversal Detected: Outgoing -> Incoming (Total Count: %d)\n", localVehicleCount);
        
        // Log to Supabase
        supabaseService.logVehicleDetection("direction2", 1, d1, timeService.getISO8601Timestamp());
        
        // Activate light timer if in AUTO mode
        if (currentMode == "auto") {
          lightOffMs = now + settings.lightOnDurationMs;
        }
        s2TriggerTime = 0; // reset
      }
    }
  }

  // Track Sensor 2 (Outgoing) Triggers
  if (d2 < settings.detectionDistanceCm && d2 > SENSOR_MIN_DISTANCE_CM) {
    if (now - s2TriggerTime > 1500) {
      s2TriggerTime = now;
      Serial.printf("[SENSOR] Sensor 2 Triggered! (Distance: %.1f cm)\n", d2);
      
      // Check if Sensor 1 was triggered recently (traversal from Incoming -> Outgoing, e.g. direction1)
      if (now - s1TriggerTime < traversalWindowMs && s1TriggerTime > 0 && (now - lastVehicleTriggerMs > VEHICLE_DETECTION_COOLDOWN_MS)) {
        lastVehicleTriggerMs = now;
        localVehicleCount++;
        Serial.printf("[VEHICLE] Traversal Detected: Incoming -> Outgoing (Total Count: %d)\n", localVehicleCount);
        
        // Log to Supabase
        supabaseService.logVehicleDetection("direction1", 1, d2, timeService.getISO8601Timestamp());
        
        // Activate light timer if in AUTO mode
        if (currentMode == "auto") {
          lightOffMs = now + settings.lightOnDurationMs;
        }
        s1TriggerTime = 0;
      }
    }
  }
}

void executeLightControl() {
  // LDR evaluation (lower analog read value is brighter light depending on pull up/down)
  int rawLdr = analogRead(PIN_LDR);
  isDaytimeState = (rawLdr >= settings.ldrThresholdDay);
  
  // RTC schedule evaluation
  bool isNightSchedule = timeService.isNightTime(settings.nightModeStart, settings.nightModeEnd);
  bool isNight = !isDaytimeState || isNightSchedule;

  // Run only if system is in Adaptive AUTO mode
  if (currentMode == "auto") {
    bool targetState = false;
    
    if (isNight) {
      // Adaptive Lighting: during the night, keep the light ON if a vehicle was recently detected
      if (millis() < lightOffMs) {
        targetState = true;
      } else {
        targetState = false; // Standby energy-saving mode (switches OFF or could dim)
      }
    } else {
      // During daytime, streetlights must always remain OFF
      targetState = false;
    }

    if (targetState != currentLightState) {
      currentLightState = targetState;
      digitalWrite(PIN_LED, currentLightState ? HIGH : LOW);
      Serial.printf("[AUTO] State transitioned: Light is now %s (LDR: %d, Night Scheduler: %s)\n", 
                    currentLightState ? "ON" : "OFF", rawLdr, isNightSchedule ? "ACTIVE" : "INACTIVE");
      
      // Upload status change logs to Supabase
      supabaseService.syncPhysicalLightState(
        currentLightState ? "ON" : "OFF", 
        "auto", 
        isDaytimeState, 
        timeService.getISO8601Timestamp()
      );
    }
  }
}
