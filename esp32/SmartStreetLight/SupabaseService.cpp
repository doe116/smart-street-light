#include "SupabaseService.h"
#include "Config.h"
#include <WiFiClientSecure.h>

SupabaseService::SupabaseService(String url, String key) {
  baseUrl = url;
  apiKey = key;
  pollingClient.setInsecure();
}

String SupabaseService::performGet(String endpoint) {
  if (WiFi.status() != WL_CONNECTED)
    return "";

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String url = baseUrl + endpoint;
  http.begin(client, url);

  http.addHeader("apikey", apiKey);
  http.addHeader("Authorization", "Bearer " + apiKey);
  http.setTimeout(4000);

  int httpCode = http.GET();
  String payload = "";

  if (httpCode == HTTP_CODE_OK) {
    payload = http.getString();
  } else {
    Serial.printf("[HTTP] GET %s failed, error code: %d\n", endpoint.c_str(),
                  httpCode);
  }

  http.end();
  return payload;
}

int SupabaseService::performPatch(String endpoint, String jsonPayload) {
  if (WiFi.status() != WL_CONNECTED)
    return -1;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String url = baseUrl + endpoint;
  http.begin(client, url);

  http.addHeader("apikey", apiKey);
  http.addHeader("Authorization", "Bearer " + apiKey);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(4000);

  int httpCode = http.PATCH(jsonPayload);
  
  if (httpCode != HTTP_CODE_OK && httpCode != 204) {
    Serial.printf("[HTTP] PATCH %s failed, error: %d, response: %s\n",
                  endpoint.c_str(), httpCode, http.getString().c_str());
  } else {
    Serial.printf("[HTTP] PATCH %s success (code: %d)\n", endpoint.c_str(),
                  httpCode);
  }

  http.end();
  return httpCode;
}

int SupabaseService::performPost(String endpoint, String jsonPayload,
                                 String preferHeader) {
  if (WiFi.status() != WL_CONNECTED)
    return -1;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String url = baseUrl + endpoint;
  http.begin(client, url);

  http.addHeader("apikey", apiKey);
  http.addHeader("Authorization", "Bearer " + apiKey);
  http.addHeader("Content-Type", "application/json");
  if (preferHeader.length() > 0) {
    http.addHeader("Prefer", preferHeader);
  }
  http.setTimeout(4000);

  int httpCode = http.POST(jsonPayload);

  if (httpCode != HTTP_CODE_OK && httpCode != HTTP_CODE_CREATED &&
      httpCode != 204) {
    Serial.printf("[HTTP] POST %s failed, error: %d, response: %s\n",
                  endpoint.c_str(), httpCode, http.getString().c_str());
  } else {
    Serial.printf("[HTTP] POST %s success (code: %d)\n", endpoint.c_str(),
                  httpCode);
  }

  http.end();
  return httpCode;
}

bool SupabaseService::fetchSettings(SystemSettings &settings) {
  // Query all configuration keys from settings table
  String payload =
      performGet("/rest/v1/system_settings?select=setting_key,setting_value");
  if (payload.length() == 0)
    return false;

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
      settings.pollingIntervalMs = (int)(val.toFloat() * 1000.0f);
      if (settings.pollingIntervalMs < 100) {
        settings.pollingIntervalMs = 100;
      }
    }
  }

  return true;
}

bool SupabaseService::fetchTargetState(TargetState &state) {
  if (WiFi.status() != WL_CONNECTED)
    return false;

  String url = baseUrl + "/rest/v1/dashboard_status?id=eq.1&select=light_status,current_mode,is_daytime,last_vehicle_detected_at";
  pollingHttp.begin(pollingClient, url);

  pollingHttp.setReuse(true);
  pollingHttp.addHeader("apikey", apiKey);
  pollingHttp.addHeader("Authorization", "Bearer " + apiKey);
  pollingHttp.setTimeout(2000);

  int httpCode = pollingHttp.GET();
  String payload = "";

  if (httpCode == HTTP_CODE_OK) {
    payload = pollingHttp.getString();
  } else {
    Serial.printf("[HTTP] Polling GET failed, error code: %d\n", httpCode);
    pollingHttp.end(); // Clear connection state on error
    return false;
  }

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
    state.lastVehicleDetectedAt = obj["last_vehicle_detected_at"].as<String>();
    return true;
  }

  return false;
}

bool SupabaseService::logVehicleDetection(String direction, int count,
                                          float distance, String timestamp) {
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

bool SupabaseService::uploadHeartbeat(int rssi, long uptimeSeconds,
                                      int ldrValue, String timestamp,
                                      String firmware) {
  DynamicJsonDocument doc(384);
  doc["id"] = 1;
  doc["wifi_rssi"] = rssi;
  doc["uptime_seconds"] = uptimeSeconds;
  doc["ldr_value"] = ldrValue;
  doc["status"] = "ONLINE";
  doc["firmware_version"] = firmware;
  // Write the current wall-clock timestamp so the dashboard online-check works.
  // The device_status.last_heartbeat column stores the last time ESP32 pinged.
  doc["last_heartbeat"] = timestamp;

  String payload;
  serializeJson(doc, payload);

  int code = performPost("/rest/v1/device_status", payload,
                         "action=upsert,resolution=merge-duplicates");
  return (code == HTTP_CODE_OK || code == HTTP_CODE_CREATED || code == 204);
}

bool SupabaseService::syncPhysicalLightState(String status, String mode,
                                             bool isDaytime, int ldrValue,
                                             String timestamp) {
  // Post a new entry to light_status to log the event, which updates dashboard
  // aggregates via triggers
  DynamicJsonDocument doc(256);
  doc["status"] = status;
  doc["mode"] = mode;
  doc["triggered_by"] = "sensor"; // Triggered automatically by physical logic
  doc["is_daytime"] = isDaytime;
  doc["illumination_level"] = ldrValue;
  doc["created_at"] = timestamp;

  String payload;
  serializeJson(doc, payload);

  int code = performPost("/rest/v1/light_status", payload);
  return (code == HTTP_CODE_CREATED || code == HTTP_CODE_OK);
}
