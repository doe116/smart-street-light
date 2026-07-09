/**
 * TimeService Class
 * Manages RTC (Real Time Clock) and NTP time synchronization.
 */
#ifndef TIME_SERVICE_H
#define TIME_SERVICE_H

#include <Arduino.h>
#include <Wire.h>
#include <RTClib.h>

class TimeService {
private:
  RTC_DS3231 rtc;
  bool rtcFound;
  long timezoneOffsetSeconds;

public:
  TimeService();
  void init();
  
  /**
   * Connect to NTP and synchronize time.
   * If successful, updates the hardware RTC register.
   */
  bool syncWithNTP();
  
  /**
   * Get the current ISO 8601 formatted timestamp string for database inserts
   */
  String getISO8601Timestamp();

  /**
   * Get the current time as a HH:MM string
   */
  String getFormattedTime();

  /**
   * Evaluates if the current hour/minute is within the configured night scheduling window
   * @param nightStart Start time in HH:MM format (e.g., "18:00")
   * @param nightEnd End time in HH:MM format (e.g., "06:00")
   */
  bool isNightTime(String nightStart, String nightEnd);
  
  /**
   * Read current epoch timestamp
   */
  uint32_t getEpochTime();
};

#endif
