# 🗄️ Supabase Database Setup Guide

## ✅ Step-by-Step Panduan Membuat Database

### Step 1: Buat Project Supabase

1. Buka https://supabase.com
2. Click **"New Project"**
3. Isi form:
   - **Project Name**: `fishfeeder`
   - **Database Password**: Catat baik-baik (Anda butuh ini nanti)
   - **Region**: Pilih `Asia-Singapore (ap-southeast-1)` atau terdekat
4. Click **"Create new project"**
5. **Tunggu 2-3 menit** hingga selesai setup

### Step 2: Copy Credentials ke `.env.local`

1. Buka Project Anda di Supabase Dashboard
2. Buka **Settings → API**
3. Copy nilai berikut:

```
Project URL  → VITE_SUPABASE_URL
anon public  → VITE_SUPABASE_ANON_KEY
```

4. Edit file `dashboard/.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

**Contoh hasil:**
```env
VITE_SUPABASE_URL=https://xyzabc123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Jalankan SQL Scripts

1. Di Dashboard Supabase, buka **SQL Editor**
2. Click **New Query**
3. **Copy semua SQL** dari file `DATABASE_SETUP.sql` 
4. **Paste** ke SQL editor
5. Click **▶️ Run** (atau Ctrl+Enter)

Atau copy command ini untuk run keseluruhan:

```bash
# Jika menggunakan Supabase CLI
supabase db pull  # untuk setup lokal
```

### Step 4: Verifikasi Tabel Sudah Dibuat

Di Supabase Dashboard:
1. Buka **Table Editor**
2. Pastikan tabel berikut ada:
   - ✅ `device_status`
   - ✅ `sensor_data`
   - ✅ `feeding_records`
   - ✅ `device_logs`

## 📊 Struktur Database

### 1. `device_status` - Status Device
```
device_id (INT, unique)
is_online (BOOLEAN)
battery_level (INT 0-100)
motor_status (TEXT: idle/running/error)
last_seen (TIMESTAMP)
created_at, updated_at
```

### 2. `sensor_data` - Data Sensor History
```
device_id (INT)
temperature (NUMERIC)
humidity (NUMERIC)
water_level (NUMERIC)
timestamp (TIMESTAMP)
created_at
```

### 3. `feeding_records` - Riwayat Pemberian Pakan
```
device_id (INT)
timestamp (TIMESTAMP)
duration (INT - dalam detik)
manual (BOOLEAN - true jika manual)
status (TEXT: pending/completed/failed)
notes (TEXT)
created_at, updated_at
```

### 4. `device_logs` - Logs Device
```
device_id (INT)
level (TEXT: INFO/WARNING/ERROR/DEBUG)
message (TEXT)
timestamp (TIMESTAMP)
created_at
```

## 🔐 Security (RLS Policies)

Database sudah dikonfigurasi dengan **Row Level Security** yang memungkinkan:
- ✅ Public READ pada `device_status`
- ✅ Public INSERT pada `sensor_data`
- ✅ Public INSERT/UPDATE pada `feeding_records`
- ✅ Public INSERT pada `device_logs`

**Catatan**: Ini cocok untuk public broker MQTT. Jika production, buat policies yang lebih strict.

## 🚀 Test Connection dari Dashboard

1. Update `.env.local` dengan credentials
2. Run dashboard: `npm run dev`
3. Buka browser console (F12)
4. Lihat apakah ada error Supabase

Jika berhasil, tidak ada error di console.

## 📡 MQTT → Supabase Flow

```
ESP32 publis MQTT
    ↓
Dashboard terima via MQTT
    ↓
Dashboard insert ke Supabase
    ↓
Data tersimpan permanent
```

Dashboard akan **otomatis sync** data ke Supabase ketika ada update dari MQTT.

## 🔧 Common Queries

### Insert Device Status
```sql
INSERT INTO device_status (device_id, is_online, battery_level, motor_status)
VALUES (1, true, 85, 'idle')
ON CONFLICT (device_id) DO UPDATE SET 
  is_online = true,
  battery_level = 85,
  updated_at = now();
```

### Insert Sensor Data
```sql
INSERT INTO sensor_data (device_id, temperature, humidity, water_level, timestamp)
VALUES (1, 28.5, 65.2, 75, now());
```

### Insert Feeding Record
```sql
INSERT INTO feeding_records (device_id, duration, manual, status)
VALUES (1, 5, true, 'completed');
```

### Get Data dari Dashboard (via API)
```javascript
// Auto-loaded saat dashboard start
const { data: sensorData } = await supabase
  .from('sensor_data')
  .select('*')
  .eq('device_id', 1)
  .order('timestamp', { ascending: false })
  .limit(50);
```

## ⚠️ Troubleshooting

### Error: "Invalid URL"
- ❌ `VITE_SUPABASE_URL` belum dikonfigurasi
- ✅ Copy dari Settings → API

### Error: "Unauthorized"
- ❌ `VITE_SUPABASE_ANON_KEY` salah/expired
- ✅ Generate ulang key di Settings → API

### Error: "Relation does not exist"
- ❌ Tabel belum dibuat
- ✅ Jalankan SQL scripts di SQL Editor

### Data tidak muncul di Supabase
- ❌ RLS policies belum enable
- ✅ Tabel sudah ada RLS policies (default allow public)

## 📈 Maintenance

### Backup Data
Di Supabase Dashboard → Backups
- Auto-backup setiap hari (free tier)
- Manual backup available

### Cleanup Old Data
```sql
-- Delete sensor data older than 90 days
DELETE FROM sensor_data WHERE created_at < now() - INTERVAL '90 days';

-- Delete logs older than 30 days  
DELETE FROM device_logs WHERE created_at < now() - INTERVAL '30 days';
```

## 💡 Tips

1. **Jangan share** VITE_SUPABASE_ANON_KEY di public repo (sudah di .gitignore)
2. **Backup** credentials di tempat aman
3. **Monitor** usage di Supabase → Settings → Billing
4. **Setup email** untuk notifications di Supabase
5. **Enable** 2FA di Supabase account

## 🎉 Siap!

Setelah setup selesai:
1. ✅ Database sudah jadi
2. ✅ Credentials di `.env.local`
3. ✅ Run `npm run dev`
4. ✅ Dashboard siap menerima data MQTT
5. ✅ Data auto-sync ke Supabase

Selamat! Database Supabase Anda ready untuk production 🚀
