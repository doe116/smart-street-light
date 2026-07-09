#include "TimeService.h"
#include "Config.h"
#include <sys/time.h>
#include <time.h>

TimeService::TimeService() {
  rtcFound = false;
  timezoneOffsetSeconds = 3 * 3600; // Default GMT+3 timezone (East Africa Time)
}

void TimeService::init() {
  // Start I2C bus on pins defined in Config.h (SDA = PIN_RTC_DAT, SCL =
  // PIN_RTC_CLK)
  Wire.begin(PIN_RTC_DAT, PIN_RTC_CLK);

  if (rtc.begin()) {
    rtcFound = true;
    Serial.println(
        F("[RTC] DS3231 RTC Module detected and initialized successfully."));
    if (rtc.lostPower()) {
      Serial.println(F(
          "[RTC] Warning: RTC lost power. Initializing to NTP sync default."));
      rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    }
  } else {
    Serial.println(F("[RTC] Error: Hardware DS3231 RTC not detected. Falling "
                     "back to ESP32 Internal Software RTC."));
  }

  // Set system environment time zone (e.g. GMT+3)
  setenv("TZ", "EAT-3", 1);
  tzset();
}

bool TimeService::syncWithNTP() {
  Serial.print(F("[NTP] Querying NTP servers..."));
  // Config time with 0 offset (UTC) so that the RTC chip stores UTC time
  configTime(0, 0, "pool.ntp.org", "time.nist.gov", "time.google.com");

  struct tm timeinfo;
  int attempts = 0;
  // Wait up to 5 seconds for synchronization
  while (!getLocalTime(&timeinfo) && attempts < 10) {
    delay(500);
    Serial.print(F("."));
    attempts++;
  }

  if (attempts < 10) {
    Serial.println(F(" Synchronized successfully!"));
    time_t now = time(nullptr);

    // Adjust hardware RTC clock register
    if (rtcFound) {
      rtc.adjust(DateTime(now));
      Serial.println(F("[RTC] Hardware clock updated with NTP timestamp."));
    }
    return true;
  } else {
    Serial.println(F(" Timeout! NTP synchronization failed."));
    return false;
  }
}

uint32_t TimeService::getEpochTime() {
  if (rtcFound) {
    return rtc.now().unixtime();
  } else {
    time_t now;
    time(&now);
    return (uint32_t)now;
  }
}

String TimeService::getISO8601Timestamp() {
  char buf[30];
  uint32_t epoch = getEpochTime();

  // Convert UTC epoch to tm structure
  time_t rawtime = (time_t)epoch;
  struct tm *ts = gmtime(&rawtime);

  // Format: YYYY-MM-DDTHH:MM:SSZ
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", ts);
  return String(buf);
}

String TimeService::getFormattedTime() {
  char buf[10];
  uint32_t epoch = getEpochTime();
  time_t rawtime = (time_t)epoch;

  // Adjust to local timezone
  rawtime += timezoneOffsetSeconds;
  struct tm *ts = gmtime(&rawtime);

  strftime(buf, sizeof(buf), "%H:%M", ts);
  return String(buf);
}

bool TimeService::isNightTime(String nightStart, String nightEnd) {
  // Parse hour and minute from strings
  int startHour = nightStart.substring(0, 2).toInt();
  int startMin = nightStart.substring(3, 5).toInt();
  int endHour = nightEnd.substring(0, 2).toInt();
  int endMin = nightEnd.substring(3, 5).toInt();

  // Get current time
  uint32_t epoch = getEpochTime();
  time_t rawtime = (time_t)epoch + timezoneOffsetSeconds;
  struct tm *ts = gmtime(&rawtime);
  int curHour = ts->tm_hour;
  int curMin = ts->tm_min;

  // Convert all to minutes from midnight
  int startMinutes = startHour * 60 + startMin;
  int endMinutes = endHour * 60 + endMin;
  int curMinutes = curHour * 60 + curMin;

  if (startMinutes < endMinutes) {
    // Standard same-day schedule (e.g. 08:00 to 18:00)
    return (curMinutes >= startMinutes && curMinutes < endMinutes);
  } else {
    // Overnight schedule spanning midnight (e.g. 18:00 to 06:00)
    return (curMinutes >= startMinutes || curMinutes < endMinutes);
  }
}
