# IoT Smart Street Light Monitoring and Control System

A production-quality IoT monitoring and adaptive control solution for modern municipal street lighting. This system combines physical sensors (HC-SR04 ultrasonic, photoresistors), local real-time clock (RTC DS3231) state evaluation on the ESP32 edge controller, a secure cloud database (Supabase PostgREST), and a real-time responsive administrator dashboard.

---

## 1. System Architecture

The project follows Clean Architecture guidelines separating hardware edge logic, backend APIs, and frontend pages.

```mermaid
graph TD
  A[Admin Web Dashboard] -- Manual Overrides --> B(Supabase REST API)
  B -- Realtime Sockets --> A
  C[ESP32 Edge Controller] -- Heartbeats & Detections --> B
  B -- HTTP Poll Commands --> C
  C -- GPIO Inputs --> D[Ultrasonic Sensors & LDR]
  C -- GPIO Output --> E[Physical LED Light]
```

### Communication Flow:
1. **Adaptive Mode**: The ESP32 evaluates LDR photoresistor ambient light levels and RTC timetables. During the night, it keeps lights off/standby until the ultrasonic distance sensors detect an approaching vehicle, triggering full brightness.
2. **Override Mode**: When an administrator toggles the light ON or OFF from the website, a row is added to the database. The ESP32 polls this endpoint every 1-2 seconds and overrides its physical logic.
3. **Telemetry & Logs**: The ESP32 pushes signal strength (RSSI), uptime, firmware versions, and vehicle detections directly to Supabase. Realtime socket listeners update dashboard statistics in under a second.

---

## 2. Database Documentation & Schema

The database is built on Supabase (PostgreSQL). Below is the ER Diagram and structural definitions:

```mermaid
erDiagram
  dashboard_status {
    int id PK
    int total_vehicles_direction1
    int total_vehicles_direction2
    int total_vehicles_all
    varchar light_status
    varchar current_mode
    boolean is_daytime
    timestamp last_vehicle_detected_at
    timestamp last_updated
  }
  
  vehicle_detections {
    bigint id PK
    varchar direction
    int vehicle_count
    timestamp detected_at
    numeric sensor_distance
    timestamp created_at
  }

  light_status {
    bigint id PK
    varchar status
    varchar mode
    varchar triggered_by
    boolean is_daytime
    integer illumination_level
    timestamp updated_at
    timestamp created_at
  }

  device_status {
    integer id PK
    integer wifi_rssi
    bigint uptime_seconds
    varchar firmware_version
    timestamp last_heartbeat
    varchar status
  }

  system_settings {
    integer id PK
    varchar setting_key
    text setting_value
    text description
    timestamp updated_at
  }
```

### Table Details:
*   `dashboard_status`: Holds the single-row current state of the dashboard (Aggregates total vehicle counts, mode states, LDR Day/Night checks).
*   `vehicle_detections`: Appends logs for each vehicle detected traversing path directions.
*   `light_status`: Historical record of light state transitions.
*   `device_status`: Telemetry heartbeat statistics for the ESP32 edge hardware.
*   `system_settings`: Configurations (distance triggers, durations, night scheduling ranges) loaded dynamically by the ESP32.

---

## 3. Hardware Pin Scheduling (ESP32)

Connect the physical peripherals to the ESP32 developer board according to this table:

| Component | Pin Type | ESP32 GPIO | Description |
| :--- | :--- | :--- | :--- |
| **Ultrasonic 1 Trig** | Output | `GPIO 32` | Trigger pin for incoming pathway scanner |
| **Ultrasonic 1 Echo** | Input | `GPIO 33` | Echo bounce read for incoming pathway scanner |
| **Ultrasonic 2 Trig** | Output | `GPIO 26` | Trigger pin for outgoing pathway scanner |
| **Ultrasonic 2 Echo** | Input | `GPIO 27` | Echo bounce read for outgoing pathway scanner |
| **LDR Sensor** | Analog Input | `GPIO 34` | Ambient photoresistor reading (Analog) |
| **Street Light LED** | Output | `GPIO 14` | LED/Relay driver pin |
| **RTC CLK** | Clock (I2C SCL) | `GPIO 21` | DS3231/DS1307 I2C SCL (or CLK for DS1302) |
| **RTC DAT** | Data (I2C SDA) | `GPIO 22` | DS3231/DS1307 I2C SDA (or DAT for DS1302) |
| **RTC RST** | Reset | `GPIO 19` | Reset line (if utilizing DS1302 3-wire module) |

---

## 4. REST API Documentation

PostgREST standard endpoints are exposed via `https://gouwnccjqsialiukqqgg.supabase.co/rest/v1`.

### 1. Get Dashboard Telemetry
*   **Endpoint**: `/dashboard_status?id=eq.1&select=*`
*   **Method**: `GET`
*   **Headers**:
    ```http
    apikey: YOUR_SUPABASE_ANON_KEY
    Authorization: Bearer YOUR_SUPABASE_ANON_KEY
    ```

### 2. Log Vehicle Detection
*   **Endpoint**: `/vehicle_detections`
*   **Method**: `POST`
*   **Payload**:
    ```json
    {
      "direction": "direction1",
      "vehicle_count": 1,
      "sensor_distance": 28.5,
      "detected_at": "2026-07-09T00:30:00.000Z"
    }
    ```

### 3. ESP32 Telemetry Heartbeat
*   **Endpoint**: `/device_status?id=eq.1`
*   **Method**: `PATCH`
*   **Payload**:
    ```json
    {
      "wifi_rssi": -65,
      "uptime_seconds": 12000,
      "last_heartbeat": "2026-07-09T00:35:00.000Z",
      "status": "ONLINE"
    }
    ```

---

## 5. Local Setup & Installation

Follow these steps to initialize the environment and execute the project locally:

### 1. Prerequisite Packages
Install Node.js (version 18+) and Git.

### 2. Install Project Dependencies
Clone the repository and install files:
```bash
npm install
```

### 3. Environment Configurations
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://gouwnccjqsialiukqqgg.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xcbzYoJBTQ8vQ9deUIHyaA_x1xcoI8Z
```

### 4. Execute Frontend Dev Server
Run the local Vite builder:
```bash
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 6. ESP32 Compiling & Firmware Upload

1.  Open Arduino IDE.
2.  Install the following libraries under **Sketch** -> **Include Library** -> **Manage Libraries**:
    *   `ArduinoJson` (by Benoit Blanchon)
    *   `RTClib` (by Adafruit)
3.  Navigate to the `esp32/SmartStreetLight` directory.
4.  Copy `secrets.h.example` to `secrets.h` and enter your local WiFi SSID, password, and the Supabase API values.
5.  Connect the ESP32 module via USB, select your board model (e.g., NodeMCU-32S) and port, and click **Upload**.

---

## 7. Troubleshooting & Maintenance

### 1. Database Insertion Errors (PL/pgSQL Shadows)
If inserts into `vehicle_detections` or `light_status` crash with `column reference 'current_mode' is ambiguous`, run the SQL repair DDL script inside the `database/schema_repair.sql` file. Copy the SQL statements and execute them inside the **SQL Editor** tab of your Supabase Cloud Console dashboard.

### 2. Device Offline Issues
*   Check serial terminal outputs at `115200` baud.
*   Verify that your local WiFi router SSID name matches the parameters configured in `secrets.h`.
*   Verify that the physical distance between the ultrasonic sensors is calibrated correctly.
