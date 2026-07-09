/**
 * SensorService Class
 * Manages HC-SR04 ultrasonic sensors and applies filtering algorithms.
 */
#ifndef SENSOR_SERVICE_H
#define SENSOR_SERVICE_H

#include <Arduino.h>

class SensorService {
private:
  int trigPin;
  int echoPin;
  float readings[5]; // Moving average filter buffer
  int readIndex;
  float total;
  float average;

public:
  SensorService(int trig, int echo);
  void init();
  
  /**
   * Performs an ultrasonic pulse query and returns the filtered distance in cm
   */
  float readDistanceFiltered();

  /**
   * Helper to perform raw pulse timings
   */
  float readRawDistance();
};

#endif
