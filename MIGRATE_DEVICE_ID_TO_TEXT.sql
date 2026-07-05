-- =====================================================
-- MIGRATION: allow ESP32 MAC address as device_id
-- Run this in Supabase SQL Editor if the tables already exist.
-- =====================================================

-- Views must be dropped before changing the type of columns they depend on.
DROP VIEW IF EXISTS latest_sensor_readings;
DROP VIEW IF EXISTS daily_feeding_summary;

ALTER TABLE IF EXISTS sensor_data
  DROP CONSTRAINT IF EXISTS fk_device;

ALTER TABLE IF EXISTS feeding_records
  DROP CONSTRAINT IF EXISTS fk_device_feeding;

ALTER TABLE IF EXISTS device_logs
  DROP CONSTRAINT IF EXISTS fk_device_logs;

ALTER TABLE IF EXISTS device_status
  ALTER COLUMN device_id TYPE TEXT USING device_id::TEXT;

ALTER TABLE IF EXISTS sensor_data
  ALTER COLUMN device_id TYPE TEXT USING device_id::TEXT;

ALTER TABLE IF EXISTS feeding_records
  ALTER COLUMN device_id TYPE TEXT USING device_id::TEXT;

ALTER TABLE IF EXISTS device_logs
  ALTER COLUMN device_id TYPE TEXT USING device_id::TEXT;

ALTER TABLE IF EXISTS sensor_data
  ADD CONSTRAINT fk_device
  FOREIGN KEY (device_id) REFERENCES device_status(device_id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS feeding_records
  ADD CONSTRAINT fk_device_feeding
  FOREIGN KEY (device_id) REFERENCES device_status(device_id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS device_logs
  ADD CONSTRAINT fk_device_logs
  FOREIGN KEY (device_id) REFERENCES device_status(device_id) ON DELETE CASCADE;

INSERT INTO device_status (device_id, is_online, battery_level, motor_status, last_seen)
VALUES ('00:00:00:00:00:00', false, 0, 'idle', now())
ON CONFLICT (device_id) DO NOTHING;

CREATE OR REPLACE VIEW daily_feeding_summary AS
SELECT
  device_id,
  DATE(timestamp) as feed_date,
  COUNT(*) as total_feeds,
  SUM(duration) as total_duration_seconds,
  COUNT(*) FILTER (WHERE manual = true) as manual_feeds,
  COUNT(*) FILTER (WHERE manual = false) as auto_feeds,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM feeding_records
GROUP BY device_id, DATE(timestamp)
ORDER BY feed_date DESC;

CREATE OR REPLACE VIEW latest_sensor_readings AS
SELECT DISTINCT ON (device_id)
  device_id,
  temperature,
  humidity,
  water_level,
  timestamp
FROM sensor_data
ORDER BY device_id, timestamp DESC;
