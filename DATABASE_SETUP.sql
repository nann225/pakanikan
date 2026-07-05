-- =====================================================
-- FISH FEEDER DATABASE SCHEMA
-- Run all SQL queries in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. TABLE: device_status
-- Menyimpan status terkini device ESP32
-- =====================================================
CREATE TABLE IF NOT EXISTS device_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE,
  is_online BOOLEAN DEFAULT false,
  battery_level INT CHECK (battery_level >= 0 AND battery_level <= 100),
  motor_status TEXT CHECK (motor_status IN ('idle', 'running', 'error')) DEFAULT 'idle',
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index untuk faster lookups
CREATE INDEX IF NOT EXISTS idx_device_status_device_id ON device_status(device_id);
CREATE INDEX IF NOT EXISTS idx_device_status_last_seen ON device_status(last_seen DESC);

-- =====================================================
-- 2. TABLE: sensor_data
-- Menyimpan data sensor history (temperature, humidity, water level)
-- =====================================================
CREATE TABLE IF NOT EXISTS sensor_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  temperature NUMERIC(5,2),
  humidity NUMERIC(5,2),
  water_level NUMERIC(5,2),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_device FOREIGN KEY (device_id) REFERENCES device_status(device_id) ON DELETE CASCADE
);

-- Create indexes untuk efficient querying
CREATE INDEX IF NOT EXISTS idx_sensor_data_device_id ON sensor_data(device_id);
CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp ON sensor_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_data_device_timestamp ON sensor_data(device_id, timestamp DESC);

-- Auto cleanup: delete data older than 90 days
-- (Run manually or setup via pg_cron extension)
-- DELETE FROM sensor_data WHERE timestamp < now() - INTERVAL '90 days';

-- =====================================================
-- 3. TABLE: feeding_records
-- Menyimpan riwayat pemberian pakan
-- =====================================================
CREATE TABLE IF NOT EXISTS feeding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  duration INT NOT NULL CHECK (duration > 0 AND duration <= 3600),
  manual BOOLEAN DEFAULT true,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_device_feeding FOREIGN KEY (device_id) REFERENCES device_status(device_id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feeding_records_device_id ON feeding_records(device_id);
CREATE INDEX IF NOT EXISTS idx_feeding_records_timestamp ON feeding_records(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_feeding_records_status ON feeding_records(status);
CREATE INDEX IF NOT EXISTS idx_feeding_records_device_timestamp ON feeding_records(device_id, timestamp DESC);

-- =====================================================
-- 4. TABLE: device_logs
-- Optional: Untuk logging error dan events device
-- =====================================================
CREATE TABLE IF NOT EXISTS device_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  level TEXT CHECK (level IN ('INFO', 'WARNING', 'ERROR', 'DEBUG')) DEFAULT 'INFO',
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_device_logs FOREIGN KEY (device_id) REFERENCES device_status(device_id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_device_logs_device_id ON device_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_device_logs_timestamp ON device_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_device_logs_level ON device_logs(level);

-- Auto cleanup: delete logs older than 30 days
-- DELETE FROM device_logs WHERE timestamp < now() - INTERVAL '30 days';

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE device_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_logs ENABLE ROW LEVEL SECURITY;

-- Create policies untuk anonymous access (Public Broker - no auth)
-- Jika ingin menambah autentikasi, buat policies yang lebih strict

CREATE POLICY "Allow public read on device_status"
  ON device_status FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on sensor_data"
  ON sensor_data FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read on sensor_data"
  ON sensor_data FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on feeding_records"
  ON feeding_records FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read on feeding_records"
  ON feeding_records FOR SELECT
  USING (true);

CREATE POLICY "Allow public update on feeding_records"
  ON feeding_records FOR UPDATE
  USING (true);

CREATE POLICY "Allow public insert on device_logs"
  ON device_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read on device_logs"
  ON device_logs FOR SELECT
  USING (true);

-- =====================================================
-- 6. INSERT SAMPLE DATA (Optional)
-- =====================================================

-- Insert sample device status
INSERT INTO device_status (device_id, is_online, battery_level, motor_status, last_seen)
VALUES ('00:00:00:00:00:00', true, 85, 'idle', now())
ON CONFLICT (device_id) DO UPDATE SET 
  is_online = true,
  battery_level = 85,
  motor_status = 'idle',
  last_seen = now(),
  updated_at = now();

-- =====================================================
-- 7. CREATE VIEWS (Optional - untuk analytics)
-- =====================================================

-- View untuk daily feeding summary
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

-- View untuk latest sensor readings
CREATE OR REPLACE VIEW latest_sensor_readings AS
SELECT DISTINCT ON (device_id)
  device_id,
  temperature,
  humidity,
  water_level,
  timestamp
FROM sensor_data
ORDER BY device_id, timestamp DESC;

-- =====================================================
-- 8. QUERIES FOR COMMON OPERATIONS
-- =====================================================

-- Get device status
-- SELECT * FROM device_status WHERE device_id = '00:00:00:00:00:00';

-- Get latest sensor data (last 50 readings)
-- SELECT * FROM sensor_data WHERE device_id = '00:00:00:00:00:00' ORDER BY timestamp DESC LIMIT 50;

-- Get feeding history for today
-- SELECT * FROM feeding_records WHERE device_id = '00:00:00:00:00:00' AND DATE(timestamp) = CURRENT_DATE ORDER BY timestamp DESC;

-- Get device health summary
-- SELECT 
--   ds.device_id,
--   ds.is_online,
--   ds.battery_level,
--   ds.motor_status,
--   (SELECT COUNT(*) FROM feeding_records WHERE device_id = ds.device_id AND DATE(timestamp) = CURRENT_DATE) as feeds_today,
--   (SELECT AVG(temperature) FROM sensor_data WHERE device_id = ds.device_id AND timestamp > now() - INTERVAL '1 hour') as avg_temp_last_hour
-- FROM device_status ds;

-- =====================================================
-- 9. CLEANUP FUNCTIONS (Optional - run monthly)
-- =====================================================

-- Delete sensor data older than 90 days
-- DELETE FROM sensor_data WHERE created_at < now() - INTERVAL '90 days';

-- Delete device logs older than 30 days
-- DELETE FROM device_logs WHERE created_at < now() - INTERVAL '30 days';

-- =====================================================
-- END OF SCHEMA
-- =====================================================
