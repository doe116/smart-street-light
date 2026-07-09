/**
 * SupabaseService Class
 * Manages HTTP REST API communications with Supabase database.
 */
#ifndef SUPABASE_SERVICE_H
#define SUPABASE_SERVICE_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

struct SystemSettings {
  int lightOnDurationMs;
  int ldrThresholdDay;
  float detectionDistanceCm;
  int heartbeatIntervalS;
  String nightModeStart;
  String nightModeEnd;
  int pollingIntervalMs;
};

struct TargetState {
  String lightStatus; // "ON" or "OFF"
  String mode;        // "auto" or "manual"
  bool isDaytime;
  String lastVehicleDetectedAt;
};

class SupabaseService {
private:
  String baseUrl;
  String apiKey;
  WiFiClientSecure pollingClient;
  HTTPClient pollingHttp;

  /**
   * Helper to perform HTTP GET requests and return response payload
   */
  String performGet(String endpoint);

  /**
   * Helper to perform HTTP PATCH requests
   */
  int performPatch(String endpoint, String jsonPayload);

  /**
   * Helper to perform HTTP POST requests
   */
  int performPost(String endpoint, String jsonPayload,
                  String preferHeader = "");

public:
  SupabaseService(String url, String key);

  /**
   * Fetch current system settings from system_settings table
   */
  bool fetchSettings(SystemSettings &settings);

  /**
   * Fetch override commands and current target state from dashboard_status
   * (id=1)
   */
  bool fetchTargetState(TargetState &state);

  /**
   * Insert a vehicle detection log into vehicle_detections table
   */
  bool logVehicleDetection(String direction, int count, float distance,
                           String timestamp);

  /**
   * Update device status (heartbeat, wifi, uptime, ldr) in device_status table
   */
  bool uploadHeartbeat(int rssi, long uptimeSeconds, int ldrValue,
                       String firmware = "1.0.0");

  /**
   * Sync active physical light status back to dashboard_status aggregates
   */
  bool syncPhysicalLightState(String status, String mode, bool isDaytime,
                              int ldrValue, String timestamp);
};

#endif
