#include "SupabaseService.h"
#include "Config.h"

SupabaseService::SupabaseService(String url, String key) {
  baseUrl = url;
  apiKey = key;
}

String SupabaseService::performGet(String endpoint) {
  if (WiFi.status() != WL_CONNECTED) return "";

  HTTPClient http;
  String url = baseUrl + endpoint;
  http.begin(url);
  
  // Set standard headers for Supabase API gateway authentication
  http.addHeader("apikey", apiKey);
  http.addHeader("Authorization", "Bearer " + apiKey);
  http.setTimeout(4000); // 4 seconds timeout limit

  int httpCode = http.GET();
  String payload = "";
  
  if (httpCode == HTTP_CODE_OK) {
    payload = http.getString();
  } else {
    Serial.printf("[HTTP] GET %s failed, error code: %d\n", endpoint.c_str(), httpCode);
  }
  
  http.end();
  return payload;
}

int SupabaseService::performPatch(String endpoint, String jsonPayload) {
  if (WiFi.status() != WL_CONNECTED) return -1;

  HTTPClient http;
  String url = baseUrl + endpoint;
  http.begin(url);
  
  http.addHeader("apikey", apiKey);
  http.addHeader("Authorization", "Bearer " + apiKey);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(4000);

  int httpCode = http.PATCH(jsonPayload);
  http.end();
  return httpCode;
}

int SupabaseService::performPost(String endpoint, String jsonPayload) {
  if (WiFi.status() != WL_CONNECTED) return -1;

  HTTPClient http;
  String url = baseUrl + endpoint;
  http.begin(url);
  
  http.addHeader("apikey", apiKey);
  http.addHeader("Authorization", "Bearer " + apiKey);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(4000);

  int httpCode = http.POST(jsonPayload);
  http.end();
  return httpCode;
}

bool SupabaseService::fetchSettings(SystemSettings &settings) {
  // Query all configuration keys from settings table
  String payload = performGet("/rest/v1/system_settings?select=setting_key,setting_value");
  if (payload.length() == 0) return false;

  // Allocate memory for parsing (settings holds around 7 values)
  DynamicJsonDocument doc(1536);
  DeserializationError error = deserializeJson(doc, payload);
  if (error) {
    Serial.printf("[JSON] Settings parse failed: %s\n", error.c_str());
    return false;
  }

  JsonArray arr = doc.as<JsonArray>();
  for (JsonObject item : arr) {
    String key = item["setting_key"].as<String>();
    String val = item["setting_value"].as<String>();

    if (key == "light_on_duration") {
      settings.lightOnDurationMs = val.toInt();
    } else if (key == "ldr_threshold_day") {
      settings.ldrThresholdDay = val.toInt();
    } else if (key == "detection_distance") {
      settings.detectionDistanceCm = val.toFloat();
    } else if (key == "heartbeat_interval") {
      settings.heartbeatIntervalS = val.toInt();
    } else if (key == "night_mode_start") {
      settings.nightModeStart = val;
    } else if (key == "night_mode_end") {
      settings.nightModeEnd = val;
    } else if (key == "realtime_polling_interval") {
      settings.pollingIntervalS = val.toInt();
    }
  }

  return true;
}

bool SupabaseService::fetchTargetState(TargetState &state) {
  // Fetch target override status from row ID = 1
  String payload = performGet("/rest/v1/dashboard_status?id=eq.1&select=light_status,current_mode,is_daytime");
  if (payload.length() == 0) return false;

  DynamicJsonDocument doc(512);
  DeserializationError error = deserializeJson(doc, payload);
  if (error) {
    Serial.printf("[JSON] Target state parse failed: %s\n", error.c_str());
    return false;
  }

  JsonArray arr = doc.as<JsonArray>();
  if (arr.size() > 0) {
    JsonObject obj = arr[0];
    state.lightStatus = obj["light_status"].as<String>();
    state.mode = obj["current_mode"].as<String>();
    state.isDaytime = obj["is_daytime"].as<bool>();
    return true;
  }
  
  return false;
}

bool SupabaseService::logVehicleDetection(String direction, int count, float distance, String timestamp) {
  DynamicJsonDocument doc(256);
  doc["direction"] = direction;
  doc["vehicle_count"] = count;
  doc["sensor_distance"] = distance;
  doc["detected_at"] = timestamp;

  String payload;
  serializeJson(doc, payload);

  int code = performPost("/rest/v1/vehicle_detections", payload);
  // PostgREST return 201 Created on successful insert
  return (code == HTTP_CODE_CREATED || code == HTTP_CODE_OK);
}

bool SupabaseService::uploadHeartbeat(int rssi, long uptimeSeconds, String timestamp, String firmware) {
  DynamicJsonDocument doc(256);
  doc["wifi_rssi"] = rssi;
  doc["uptime_seconds"] = uptimeSeconds;
  doc["last_heartbeat"] = timestamp;
  doc["status"] = "ONLINE";
  doc["firmware_version"] = firmware;

  String payload;
  serializeJson(doc, payload);

  int code = performPatch("/rest/v1/device_status?id=eq.1", payload);
  return (code == HTTP_CODE_OK || code == 204); // 204 No Content is standard response for PATCH
}

bool SupabaseService::syncPhysicalLightState(String status, String mode, bool isDaytime, String timestamp) {
  // Post a new entry to light_status to log the event, which updates dashboard aggregates via triggers
  DynamicJsonDocument doc(256);
  doc["status"] = status;
  doc["mode"] = mode;
  doc["triggered_by"] = "sensor"; // Triggered automatically by physical logic
  doc["is_daytime"] = isDaytime;
  doc["illumination_level"] = 1500; // Simulated default photoresistor reading
  doc["created_at"] = timestamp;

  String payload;
  serializeJson(doc, payload);

  int code = performPost("/rest/v1/light_status", payload);
  return (code == HTTP_CODE_CREATED || code == HTTP_CODE_OK);
}
