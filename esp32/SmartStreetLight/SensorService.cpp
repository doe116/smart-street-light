#include "SensorService.h"
#include "Config.h"

SensorService::SensorService(int trig, int echo) {
  trigPin = trig;
  echoPin = echo;
  readIndex = 0;
  total = 0.0f;
  average = 0.0f;
  for (int i = 0; i < FILTER_WINDOW_SIZE; i++) {
    readings[i] = 0.0f;
  }
}

void SensorService::init() {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  digitalWrite(trigPin, LOW);
  
  // Prime the moving average filter buffer
  float initialDistance = readRawDistance();
  if (initialDistance <= 0.0f || initialDistance > SENSOR_MAX_DISTANCE_CM) {
    initialDistance = SENSOR_MAX_DISTANCE_CM;
  }
  for (int i = 0; i < FILTER_WINDOW_SIZE; i++) {
    readings[i] = initialDistance;
  }
  total = initialDistance * FILTER_WINDOW_SIZE;
  average = initialDistance;
}

float SensorService::readRawDistance() {
  // Clear the trigger pin
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  
  // Send a 10 microsecond pulse
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  // Measure the bounce back pulse duration in microseconds
  // Timeout set to 15000us (covers up to ~2.5 meters, reducing latency)
  long duration = pulseIn(echoPin, HIGH, 15000);
  
  if (duration == 0) {
    return SENSOR_MAX_DISTANCE_CM; // Timeout or sensor fault
  }
  
  // Calculate distance in cm (Speed of sound is 343 m/s or 0.0343 cm/us)
  float distance = (duration * 0.0343f) / 2.0f;
  
  // Constrain to configured ranges
  if (distance < SENSOR_MIN_DISTANCE_CM) return SENSOR_MIN_DISTANCE_CM;
  if (distance > SENSOR_MAX_DISTANCE_CM) return SENSOR_MAX_DISTANCE_CM;
  
  return distance;
}

float SensorService::readDistanceFiltered() {
  // Subtract the oldest reading from total
  total = total - readings[readIndex];
  
  // Fetch new raw reading
  float newReading = readRawDistance();
  
  // Store new reading
  readings[readIndex] = newReading;
  
  // Add reading to total
  total = total + readings[readIndex];
  
  // Advance index
  readIndex = (readIndex + 1) % FILTER_WINDOW_SIZE;
  
  // Calculate average
  average = total / FILTER_WINDOW_SIZE;
  
  return average;
}
