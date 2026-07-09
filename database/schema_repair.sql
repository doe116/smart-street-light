-- IoT Smart Street Light Monitoring and Control System
-- Database Repair and Extensions Schema
-- Run this script in the Supabase SQL Editor to resolve the PL/pgSQL shadow trigger bug.

-- 1. Drop existing bugged triggers and functions to prevent duplication
DROP TRIGGER IF EXISTS trg_vehicle_detection_inserted ON vehicle_detections;
DROP TRIGGER IF EXISTS trg_light_status_inserted ON light_status;
DROP TRIGGER IF EXISTS update_dashboard_status ON vehicle_detections;
DROP TRIGGER IF EXISTS update_dashboard_status ON light_status;
DROP FUNCTION IF EXISTS update_dashboard_status();
DROP FUNCTION IF EXISTS sync_dashboard_status_on_detection();
DROP FUNCTION IF EXISTS sync_dashboard_status_on_light();

-- 2. Create clean, isolated trigger function for vehicle detections
-- This function updates dashboard aggregates on a new vehicle detection
CREATE OR REPLACE FUNCTION sync_dashboard_status_on_detection()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direction = 'direction1' THEN
    UPDATE dashboard_status
    SET 
      total_vehicles_direction1 = COALESCE(total_vehicles_direction1, 0) + NEW.vehicle_count,
      total_vehicles_all = COALESCE(total_vehicles_all, 0) + NEW.vehicle_count,
      last_vehicle_detected_at = NEW.detected_at,
      last_updated = now()
    WHERE id = 1;
  ELSIF NEW.direction = 'direction2' THEN
    UPDATE dashboard_status
    SET 
      total_vehicles_direction2 = COALESCE(total_vehicles_direction2, 0) + NEW.vehicle_count,
      total_vehicles_all = COALESCE(total_vehicles_all, 0) + NEW.vehicle_count,
      last_vehicle_detected_at = NEW.detected_at,
      last_updated = now()
    WHERE id = 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind the detection trigger
CREATE TRIGGER trg_vehicle_detection_inserted
AFTER INSERT ON vehicle_detections
FOR EACH ROW
EXECUTE FUNCTION sync_dashboard_status_on_detection();

-- 3. Create clean trigger function for light status changes
-- This function updates the dashboard current light state and mode
CREATE OR REPLACE FUNCTION sync_dashboard_status_on_light()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE dashboard_status
  SET
    light_status = NEW.status,
    current_mode = NEW.mode,
    is_daytime = NEW.is_daytime,
    last_updated = now()
  WHERE id = 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind the light status trigger
CREATE TRIGGER trg_light_status_inserted
AFTER INSERT ON light_status
FOR EACH ROW
EXECUTE FUNCTION sync_dashboard_status_on_light();

-- 4. Create device_status table to track ESP32 hardware logs and status
CREATE TABLE IF NOT EXISTS device_status (
  id integer PRIMARY KEY DEFAULT 1,
  wifi_rssi integer,
  uptime_seconds bigint,
  firmware_version varchar(50),
  last_heartbeat timestamp with time zone DEFAULT now(),
  status varchar(20) DEFAULT 'ONLINE',
  ldr_value integer
);

-- Alter table to add ldr_value if the table already existed without it
ALTER TABLE device_status ADD COLUMN IF NOT EXISTS ldr_value integer;

-- Create trigger function to automatically update heartbeat timestamp on update
CREATE OR REPLACE FUNCTION update_device_heartbeat()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_heartbeat = now();
  NEW.status = 'ONLINE';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind the heartbeat trigger
DROP TRIGGER IF EXISTS trg_device_status_updated ON device_status;
CREATE TRIGGER trg_device_status_updated
BEFORE UPDATE ON device_status
FOR EACH ROW
EXECUTE FUNCTION update_device_heartbeat();

-- Insert initial device row if missing
INSERT INTO device_status (id, wifi_rssi, uptime_seconds, firmware_version, status, ldr_value)
VALUES (1, -50, 0, '1.0.0', 'ONLINE', 2000)
ON CONFLICT (id) DO NOTHING;

-- 5. Extend system settings for calibration
INSERT INTO system_settings (id, setting_key, setting_value, description)
VALUES 
  (5, 'detection_distance', '35', 'Threshold distance in cm for vehicle detection'),
  (6, 'heartbeat_interval', '10', 'Interval in seconds between heartbeats'),
  (7, 'realtime_polling_interval', '0.3', 'Website/device refresh polling configuration')
ON CONFLICT (id) DO NOTHING;

-- Force update detection distance to 35 cm if it was previously set to 8 cm
UPDATE system_settings 
SET setting_value = '35' 
WHERE setting_key = 'detection_distance' AND setting_value = '8';

-- 6. Add default values for base system settings if missing
INSERT INTO system_settings (id, setting_key, setting_value, description)
VALUES 
  (1, 'light_on_duration', '2000', 'Duration in milliseconds to keep light ON after vehicle detection'),
  (2, 'night_mode_start', '18:00', 'Time to switch to night mode (24h format)'),
  (3, 'night_mode_end', '06:00', 'Time to switch to day mode (24h format)'),
  (4, 'ldr_threshold_day', '2000', 'LDR value threshold for day/night detection')
ON CONFLICT (id) DO NOTHING;

-- 7. Ensure standard dashboard_status record 1 exists
INSERT INTO dashboard_status (id, total_vehicles_direction1, total_vehicles_direction2, total_vehicles_all, light_status, current_mode, is_daytime, last_vehicle_detected_at, last_updated)
VALUES (1, 0, 0, 0, 'OFF', 'auto', false, NULL, now())
ON CONFLICT (id) DO NOTHING;

-- 8. Add helper function to get current database server time for client clock skew calibration
CREATE OR REPLACE FUNCTION get_server_time()
RETURNS timestamp with time zone AS $$
BEGIN
  RETURN now();
END;
$$ LANGUAGE plpgsql;

-- 9. Enable realtime replication for required tables
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['device_status', 'dashboard_status', 'vehicle_detections', 'light_status', 'admin_logs'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class WHERE relname = t AND relnamespace = 'public'::regnamespace
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr
      JOIN pg_class c ON pr.prrelid = c.oid
      JOIN pg_publication p ON pr.prpubid = p.oid
      WHERE c.relname = t AND p.pubname = 'supabase_realtime'
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END $$;

