
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
int readLDR(); // Smoothed LDR read (avg of 5 samples)

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
  analogSetPinAttenuation(
      PIN_LDR, ADC_11db); // Configure GPIO 34 for full 0–3.3V ADC range

  // 2. Initialize Services
  sensor1.init();
  sensor2.init();
  timeService.init();

  // 3. Connect to WiFi network
  connectWiFi();

  // 4. Synchronize clock with NTP
  timeService.syncWithNTP();

  // 5. Pre-load fallback defaults so the system runs correctly before DB fetch
  settings.lightOnDurationMs = DEFAULT_LIGHT_ON_DURATION_MS;
  settings.ldrThresholdDay = DEFAULT_LDR_THRESHOLD_DAY;
  settings.detectionDistanceCm = DEFAULT_DETECTION_DISTANCE_CM;
  settings.heartbeatIntervalS = DEFAULT_HEARTBEAT_INTERVAL_S;
  settings.nightModeStart = DEFAULT_NIGHT_START;
  settings.nightModeEnd = DEFAULT_NIGHT_END;
  settings.pollingIntervalMs = DEFAULT_POLLING_INTERVAL_MS;
  fetchSystemSettings(); // Overwrite with live DB values if available
  TargetState initialTarget;
  if (supabaseService.fetchTargetState(initialTarget)) {
    lastProcessedVehicleTime = initialTarget.lastVehicleDetectedAt;
    lastLoggedVehicleTime = initialTarget.lastVehicleDetectedAt;
    Serial.printf("[SYSTEM] Initial vehicle detection timestamp: %s\n",
                  lastProcessedVehicleTime.c_str());
  }

  // 6. Push initial heartbeat report (hardcoded ONLINE + daytime LDR)
  supabaseService.uploadHeartbeat(WiFi.RSSI(), millis() / 1000, 4095,
                                  timeService.getISO8601Timestamp());

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

  // 3. Periodically poll target override commands (every pollingIntervalMs
  // milliseconds)
  if (millis() - lastCommandCheckMs >= settings.pollingIntervalMs) {
    if (WiFi.status() == WL_CONNECTED) {
      pollTargetOverrides();
    }
  }

  // 4. Run State Machine to evaluate Light state (continual, non-blocking)
  executeLightControl();

  // 5. Heartbeat — fires every 10 s, always reports ONLINE + hardcoded daytime LDR
  if (millis() - lastHeartbeatMs >= 10000UL) {
    if (WiFi.status() == WL_CONNECTED) {
      lastHeartbeatMs = millis();
      bool hbOk = supabaseService.uploadHeartbeat(
          WiFi.RSSI(), millis() / 1000,
          4095, // HARDCODED: always report daytime-level LDR
          timeService.getISO8601Timestamp());
      Serial.printf("[HEARTBEAT] Upload %s (RSSI: %d dBm)\n",
                    hbOk ? "OK" : "FAILED", WiFi.RSSI());
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

      // Activate light timer in AUTO mode (duration from DB settings)
      if (currentMode == "auto") {
        lightOffMs = millis() + settings.lightOnDurationMs;

        // Physically turn light ON and sync with database
        currentLightState = true;
        digitalWrite(PIN_LED, HIGH);
        Serial.printf("[AUTO] Light ON for %d ms due to external trigger.\n",
                      settings.lightOnDurationMs);

        if (WiFi.status() == WL_CONNECTED) {
          supabaseService.syncPhysicalLightState(
              "ON", "auto", isDaytimeState, readLDR(),
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
            readLDR(), timeService.getISO8601Timestamp());
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
  if (d1 < settings.detectionDistanceCm && d1 > SENSOR_MIN_DISTANCE_CM) {
    if (now - s1TriggerTime > 2000) { // Cooldown of 2 seconds
      s1TriggerTime = now;
      Serial.printf("[SENSOR] Sensor 1 Triggered! (Distance: %.1f cm)\n", d1);

      localVehicleCount++;
      Serial.printf("[VEHICLE] Detected via Sensor 1 (Total Count: %d)\n",
                    localVehicleCount);

      // --- Turn light ON immediately (hardcoded 2 s) ---
      lightOffMs = now + 2000UL;
      currentLightState = true;
      digitalWrite(PIN_LED, HIGH);
      Serial.println(F("[LIGHT] LED ON for 2 s (Sensor 1)"));

      // --- Send vehicle log to Supabase ---
      if (WiFi.status() == WL_CONNECTED) {
        String nowTimestamp = timeService.getISO8601Timestamp();
        lastLoggedVehicleTime = nowTimestamp;
        lastProcessedVehicleTime = nowTimestamp;
        bool vOk = supabaseService.logVehicleDetection("direction1", 1, d1, nowTimestamp);
        Serial.printf("[DB] vehicle_detections insert: %s\n", vOk ? "OK" : "FAILED");

        // --- Sync light ON state to dashboard ---
        bool lOk = supabaseService.syncPhysicalLightState(
            "ON", "auto", true /*hardcoded daytime*/, 4095 /*hardcoded LDR*/,
            nowTimestamp);
        Serial.printf("[DB] light_status insert: %s\n", lOk ? "OK" : "FAILED");
      } else {
        Serial.println(F("[DB] WiFi not connected — Supabase skipped"));
      }
    }
  }

  // Track Sensor 2 (Outgoing) Triggers
  if (d2 < settings.detectionDistanceCm && d2 > SENSOR_MIN_DISTANCE_CM) {
    if (now - s2TriggerTime > 1500) {
      s2TriggerTime = now;
      Serial.printf("[SENSOR] Sensor 2 Triggered! (Distance: %.1f cm)\n", d2);

      // Confirmed traversal: S1 triggered within window
      if (now - s1TriggerTime < traversalWindowMs && s1TriggerTime > 0 &&
          (now - lastVehicleTriggerMs > VEHICLE_DETECTION_COOLDOWN_MS)) {
        lastVehicleTriggerMs = now;
        localVehicleCount++;
        Serial.printf("[VEHICLE] Traversal S1->S2 (Total Count: %d)\n",
                      localVehicleCount);

        // --- Turn light ON immediately (hardcoded 2 s) ---
        lightOffMs = now + 2000UL;
        currentLightState = true;
        digitalWrite(PIN_LED, HIGH);
        Serial.println(F("[LIGHT] LED ON for 2 s (Sensor 2 traversal)"));

        // --- Send vehicle log to Supabase ---
        if (WiFi.status() == WL_CONNECTED) {
          String nowTimestamp = timeService.getISO8601Timestamp();
          lastLoggedVehicleTime = nowTimestamp;
          lastProcessedVehicleTime = nowTimestamp;
          bool vOk = supabaseService.logVehicleDetection("direction2", 1, d2, nowTimestamp);
          Serial.printf("[DB] vehicle_detections insert: %s\n", vOk ? "OK" : "FAILED");

          // --- Sync light ON state to dashboard ---
          bool lOk = supabaseService.syncPhysicalLightState(
              "ON", "auto", true /*hardcoded daytime*/, 4095 /*hardcoded LDR*/,
              nowTimestamp);
          Serial.printf("[DB] light_status insert: %s\n", lOk ? "OK" : "FAILED");
        } else {
          Serial.println(F("[DB] WiFi not connected — Supabase skipped"));
        }
        s1TriggerTime = 0;
      }
    }
  }
}

void executeLightControl() {
  // HARDCODED: always treat as daytime — LDR sensor bypassed
  isDaytimeState = true;

  // Only the vehicle-detection timer drives the light in AUTO mode.
  // Night-schedule logic is intentionally disabled while hardcoded.
  if (currentMode == "auto") {
    bool targetState = (millis() < lightOffMs); // ON only during 2 s window

    if (targetState != currentLightState) {
      currentLightState = targetState;
      digitalWrite(PIN_LED, currentLightState ? HIGH : LOW);
      Serial.printf("[AUTO] Light -> %s\n",
                    currentLightState ? "ON" : "OFF");

      // Sync light OFF event back to Supabase
      if (!currentLightState && WiFi.status() == WL_CONNECTED) {
        bool lOk = supabaseService.syncPhysicalLightState(
            "OFF", "auto", true /*daytime*/, 4095 /*hardcoded LDR*/,
            timeService.getISO8601Timestamp());
        Serial.printf("[DB] light_status OFF sync: %s\n",
                      lOk ? "OK" : "FAILED");
      }
    }
  }
}

/**
 * Smoothed LDR reading: average of 5 ADC samples to reduce ESP32 ADC noise.
 * GPIO 34 is input-only with no pull resistors; attenuation must be set
 * via analogSetPinAttenuation(PIN_LDR, ADC_11db) in setup().
 */
int readLDR() {
  long sum = 0;
  for (int i = 0; i < 5; i++) {
    sum += analogRead(PIN_LDR);
    delayMicroseconds(500);
  }
  return (int)(sum / 5);
}
