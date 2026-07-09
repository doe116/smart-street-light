/**
 * IoT Smart Street Light - Hardware & System Configuration
 */
#ifndef CONFIG_H
#define CONFIG_H

// --- Hardware Pin Definitions ---
#define PIN_TRIG_1 32        // Ultrasonic Sensor 1 (Direction 1 - Incoming)
#define PIN_ECHO_1 33
#define PIN_TRIG_2 26        // Ultrasonic Sensor 2 (Direction 2 - Outgoing)
#define PIN_ECHO_2 27

#define PIN_LED 14           // Streetlight Switch LED output
#define PIN_LDR 34           // Ambient Light sensor (analog input)

// DS1302 RTC ThreeWire Interface Pins
#define PIN_RTC_CLK 21
#define PIN_RTC_DAT 22
#define PIN_RTC_RST 19

// --- Sensor Calibration & Limits ---
#define SENSOR_MIN_DISTANCE_CM 0.0f
#define SENSOR_MAX_DISTANCE_CM 400.0f
#define FILTER_WINDOW_SIZE 5      // Moving average buffer size

// Debounce/Cooldown Parameters
#define VEHICLE_DETECTION_COOLDOWN_MS 2000 // Cooldown before counting another vehicle

// Fallback Default Settings (used if database setting fetches fail)
#define DEFAULT_LDR_THRESHOLD_DAY 2000
#define DEFAULT_DETECTION_DISTANCE_CM 8.0f
#define DEFAULT_LIGHT_ON_DURATION_MS 5000
#define DEFAULT_HEARTBEAT_INTERVAL_S 10
#define DEFAULT_NIGHT_START "18:00"
#define DEFAULT_NIGHT_END "06:00"
#define DEFAULT_POLLING_INTERVAL_S 2

#endif
