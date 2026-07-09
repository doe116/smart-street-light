/**
 * SupabaseService Class
 * Manages HTTP REST API communications with Supabase database.
 */
#ifndef SUPABASE_SERVICE_H
#define SUPABASE_SERVICE_H

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

struct SystemSettings {
  int lightOnDurationMs;
  int ldrThresholdDay;
  float detectionDistanceCm;
  int heartbeatIntervalS;
  String nightModeStart;
  String nightModeEnd;
  int pollingIntervalS;
};

struct TargetState {
  String lightStatus;  // "ON" or "OFF"
  String mode;         // "auto" or "manual"
  bool isDaytime;
};

class SupabaseService {
private:
  String baseUrl;
  String apiKey;
  
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
  int performPost(String endpoint, String jsonPayload);

public:
  SupabaseService(String url, String key);
  
  /**
   * Fetch current system settings from system_settings table
   */
  bool fetchSettings(SystemSettings &settings);

  /**
   * Fetch override commands and current target state from dashboard_status (id=1)
   */
  bool fetchTargetState(TargetState &state);

  /**
   * Insert a vehicle detection log into vehicle_detections table
   */
  bool logVehicleDetection(String direction, int count, float distance, String timestamp);

  /**
   * Update device status (heartbeat, wifi, uptime) in device_status table
   */
  bool uploadHeartbeat(int rssi, long uptimeSeconds, String timestamp, String firmware = "1.0.0");

  /**
   * Sync active physical light status back to dashboard_status aggregates
   */
  bool syncPhysicalLightState(String status, String mode, bool isDaytime, String timestamp);
};

#endif
