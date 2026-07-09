
#include "Config.h"
#include "SensorService.h"
#include "SupabaseService.h"
#include "TimeService.h"
#include "secrets.h"
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>

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
bool currentLightState = false; // false = OFF, true = ON
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
const unsigned long traversalWindowMs =
    1500; // Time window to traverse between sensors

// External/simulated vehicle detection tracking
String lastProcessedVehicleTime = "";
String lastLoggedVehicleTime = "";

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

  // 5. Initial fetch of DB configurations and target states
  fetchSystemSettings();
  TargetState initialTarget;
  if (supabaseService.fetchTargetState(initialTarget)) {
    lastProcessedVehicleTime = initialTarget.lastVehicleDetectedAt;
    lastLoggedVehicleTime = initialTarget.lastVehicleDetectedAt;
    Serial.printf("[SYSTEM] Initial vehicle detection timestamp: %s\n",
                  lastProcessedVehicleTime.c_str());
  }

  // 6. Push initial heartbeat report
  supabaseService.uploadHeartbeat(WiFi.RSSI(), millis() / 1000,
                                  analogRead(PIN_LDR));

  Serial.println(F("[SYSTEM] Initialization completed. Main loop active."));
}

void loop() {
  // Guard WiFi connection status
  checkWiFiConnection();

  // 1. Process Ultrasonic Scanners (every 30 ms)
  static unsigned long lastSensorCheckMs = 0;
  if (millis() - lastSensorCheckMs >= 30) {
    lastSensorCheckMs = millis();
    processSensors();
  }

  // 2. Periodically fetch system configuration settings (every 60 seconds)
  if (millis() - lastSettingsFetchMs >= 60000) {
    if (WiFi.status() == WL_CONNECTED) {
      fetchSystemSettings();
    }
  }

  // 3. Periodically poll target override commands (every pollingIntervalMs milliseconds)
  if (millis() - lastCommandCheckMs >= settings.pollingIntervalMs) {
    if (WiFi.status() == WL_CONNECTED) {
      pollTargetOverrides();
    }
  }

  // 4. Run State Machine to evaluate Light state (continual, non-blocking)
  executeLightControl();

  // 5. Periodically upload heartbeat telemetry (every heartbeatIntervalS
  // seconds)
  if (millis() - lastHeartbeatMs >= (settings.heartbeatIntervalS * 1000)) {
    if (WiFi.status() == WL_CONNECTED) {
      lastHeartbeatMs = millis();
      supabaseService.uploadHeartbeat(WiFi.RSSI(), millis() / 1000,
                                      analogRead(PIN_LDR));
    }
  }

  // Minimal yield to prevent WDT reset
  delay(10);
}

void connectWiFi() {
  Serial.print(F("[WIFI] Connecting to SSID: "));
  Serial.println(SECRET_WIFI_SSID);

  WiFi.begin(SECRET_WIFI_SSID, SECRET_WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(F("."));
  }

  Serial.println(F("\n[WIFI] Connected! IP Address: "));
  Serial.println(WiFi.localIP());
}

void checkWiFiConnection() {
  static unsigned long lastReconnectAttempt = 0;
  if (WiFi.status() != WL_CONNECTED) {
    unsigned long now = millis();
    if (lastReconnectAttempt == 0 || now - lastReconnectAttempt >= 15000) {
      lastReconnectAttempt = now;
      Serial.println(F("[WIFI] Connection lost. Reconnecting..."));
      WiFi.disconnect();
      WiFi.begin(SECRET_WIFI_SSID, SECRET_WIFI_PASSWORD);
    }
  } else {
    lastReconnectAttempt = 0;
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
    Serial.printf("  - Sensor Distance: %.1f cm\n",
                  settings.detectionDistanceCm);
    Serial.printf("  - Heartbeat Interval: %d s\n",
                  settings.heartbeatIntervalS);
    Serial.printf("  - Night Start: %s, End: %s\n",
                   settings.nightModeStart.c_str(),
                   settings.nightModeEnd.c_str());
    Serial.printf("  - Polling Rate: %d ms\n", settings.pollingIntervalMs);
  } else {
    Serial.println(
        F("[CONFIG] Settings fetch failed. Utilizing local defaults."));
    // Load config fallback defaults
    settings.lightOnDurationMs = DEFAULT_LIGHT_ON_DURATION_MS;
    settings.ldrThresholdDay = DEFAULT_LDR_THRESHOLD_DAY;
    settings.detectionDistanceCm = DEFAULT_DETECTION_DISTANCE_CM;
    settings.heartbeatIntervalS = DEFAULT_HEARTBEAT_INTERVAL_S;
    settings.nightModeStart = DEFAULT_NIGHT_START;
    settings.nightModeEnd = DEFAULT_NIGHT_END;
    settings.pollingIntervalMs = DEFAULT_POLLING_INTERVAL_MS;
  }
}

void pollTargetOverrides() {
  lastCommandCheckMs = millis();
  TargetState tempTarget;
  if (supabaseService.fetchTargetState(tempTarget)) {
    target = tempTarget;
    currentMode = target.mode;

    Serial.printf("[DEBUG] Poll target: lastVehicleDetectedAt='%s', "
                  "lastProcessed='%s', lastLogged='%s', mode='%s'\n",
                  target.lastVehicleDetectedAt.c_str(),
                  lastProcessedVehicleTime.c_str(),
                  lastLoggedVehicleTime.c_str(), currentMode.c_str());

    // Check for simulated/external vehicle trigger
    if (target.lastVehicleDetectedAt != "" &&
        target.lastVehicleDetectedAt != lastProcessedVehicleTime &&
        target.lastVehicleDetectedAt != lastLoggedVehicleTime) {

      Serial.printf(
          "[VEHICLE] External trigger detected! Timestamp: %s (Prev: %s)\n",
          target.lastVehicleDetectedAt.c_str(),
          lastProcessedVehicleTime.c_str());

      lastProcessedVehicleTime = target.lastVehicleDetectedAt;

      // Activate light timer for 2 seconds (2000 ms) in AUTO mode
      if (currentMode == "auto") {
        lightOffMs = millis() + 2000;

        // Physically turn light ON and sync with database
        currentLightState = true;
        digitalWrite(PIN_LED, HIGH);
        Serial.println(
            F("[AUTO] Light activated for 2 seconds due to external trigger."));

        if (WiFi.status() == WL_CONNECTED) {
          supabaseService.syncPhysicalLightState(
              "ON", "auto", isDaytimeState, analogRead(PIN_LDR),
              timeService.getISO8601Timestamp());
        }
      }
    }

    // If Mode is MANUAL, directly follow database target state overrides
    if (currentMode == "manual") {
      bool targetState = (target.lightStatus == "ON");
      if (targetState != currentLightState) {
        currentLightState = targetState;
        digitalWrite(PIN_LED, currentLightState ? HIGH : LOW);
        Serial.printf(
            "[OVERRIDE] Manual override action executed: Light is now %s\n",
            currentLightState ? "ON" : "OFF");

        // Log back change to light_status
        supabaseService.syncPhysicalLightState(
            currentLightState ? "ON" : "OFF", "manual", isDaytimeState,
            analogRead(PIN_LDR), timeService.getISO8601Timestamp());
      }
    }
  }
}

void processSensors() {
  // Read raw distance directly to detect fast-moving vehicles instantly
  float d1 = sensor1.readRawDistance();
  float d2 = sensor2.readRawDistance();

  unsigned long now = millis();

  // Track Sensor 1 (Incoming) Triggers - Direction A
  // Any distance less than 7.0 cm counts as a vehicle detected
  if (d1 < 7.0f && d1 > SENSOR_MIN_DISTANCE_CM) {
    if (now - s1TriggerTime > 2000) { // Cooldown of 2 seconds
      s1TriggerTime = now;
      Serial.printf("[SENSOR] Sensor 1 Triggered! (Distance: %.1f cm)\n", d1);

      localVehicleCount++;
      Serial.printf(
          "[VEHICLE] Traversal Detected: Sensor 1 (Total Count: %d)\n",
          localVehicleCount);

      // Log to Supabase as direction1 (Direction A)
      if (WiFi.status() == WL_CONNECTED) {
        String nowTimestamp = timeService.getISO8601Timestamp();
        lastLoggedVehicleTime = nowTimestamp;
        lastProcessedVehicleTime = nowTimestamp;
        supabaseService.logVehicleDetection("direction1", 1, d1, nowTimestamp);
      }

      // Activate light timer for 2 seconds (2000 ms) in AUTO mode
      if (currentMode == "auto") {
        lightOffMs = now + 2000;

        // Physically turn light ON and sync with database
        currentLightState = true;
        digitalWrite(PIN_LED, HIGH);
        Serial.println(
            F("[AUTO] Light activated for 2 seconds due to Sensor 1 trigger."));

        if (WiFi.status() == WL_CONNECTED) {
          supabaseService.syncPhysicalLightState(
              "ON", "auto", isDaytimeState, analogRead(PIN_LDR),
              timeService.getISO8601Timestamp());
        }
      }
    }
  }

  // Track Sensor 2 (Outgoing) Triggers
  if (d2 < 7.0f && d2 > SENSOR_MIN_DISTANCE_CM) {
    if (now - s2TriggerTime > 1500) {
      s2TriggerTime = now;
      Serial.printf("[SENSOR] Sensor 2 Triggered! (Distance: %.1f cm)\n", d2);

      // Check if Sensor 1 was triggered recently (traversal from Incoming ->
      // Outgoing, e.g. direction1)
      if (now - s1TriggerTime < traversalWindowMs && s1TriggerTime > 0 &&
          (now - lastVehicleTriggerMs > VEHICLE_DETECTION_COOLDOWN_MS)) {
        lastVehicleTriggerMs = now;
        localVehicleCount++;
        Serial.printf("[VEHICLE] Traversal Detected: Incoming -> Outgoing "
                      "(Total Count: %d)\n",
                      localVehicleCount);

        // Log to Supabase
        if (WiFi.status() == WL_CONNECTED) {
          String nowTimestamp = timeService.getISO8601Timestamp();
          lastLoggedVehicleTime = nowTimestamp;
          lastProcessedVehicleTime = nowTimestamp;
          supabaseService.logVehicleDetection("direction1", 1, d2,
                                              nowTimestamp);
        }

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
  // LDR evaluation (lower analog read value is brighter light depending on pull
  // up/down)
  int rawLdr = analogRead(PIN_LDR);
  isDaytimeState = (rawLdr >= settings.ldrThresholdDay);

  // RTC schedule evaluation
  bool isNightSchedule =
      timeService.isNightTime(settings.nightModeStart, settings.nightModeEnd);
  bool isNight = !isDaytimeState || isNightSchedule;

  // Run only if system is in Adaptive AUTO mode
  if (currentMode == "auto") {
    bool targetState = false;

    if (millis() < lightOffMs) {
      // Keep light ON if vehicle detection timer is active (even during
      // daytime)
      targetState = true;
    } else if (isNight) {
      // Adaptive Lighting: during the night, keep standby mode (off or could
      // dim)
      targetState = false;
    } else {
      // During daytime, streetlights remain OFF
      targetState = false;
    }

    if (targetState != currentLightState) {
      currentLightState = targetState;
      digitalWrite(PIN_LED, currentLightState ? HIGH : LOW);
      Serial.printf("[AUTO] State transitioned: Light is now %s (LDR: %d, "
                    "Night Scheduler: %s)\n",
                    currentLightState ? "ON" : "OFF", rawLdr,
                    isNightSchedule ? "ACTIVE" : "INACTIVE");

      // Upload status change logs to Supabase
      if (WiFi.status() == WL_CONNECTED) {
        supabaseService.syncPhysicalLightState(
            currentLightState ? "ON" : "OFF", "auto", isDaytimeState, rawLdr,
            timeService.getISO8601Timestamp());
      }
    }
  }
}
