# Fish Feeder Dashboard 🐠

Real-time monitoring dashboard untuk sistem pemberi pakan ikan otomatis berbasis ESP32. Dashboard ini menggunakan teknologi modern untuk monitoring dan kontrol perangkat.

## Teknologi Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Database**: Supabase (PostgreSQL)
- **Real-time Communication**: MQTT WebSocket dengan HiveMQ Public Broker
- **State Management**: Zustand
- **Data Visualization**: Recharts
- **Styling**: CSS3 dengan responsive design
- **Icons**: React Icons

## Fitur Utama

✨ **Real-time Monitoring**
- Status koneksi MQTT dan device
- Monitoring sensor data (suhu, kelembaban, level air)
- Visualisasi data dengan grafik real-time

🎮 **Kontrol Manual**
- Tombol untuk memberi pakan manual
- Pengaturan durasi pemberian pakan
- Feedback status motor

📊 **Dashboard Analytics**
- Riwayat pemberian pakan
- Status device dan battery
- Grafik sensor data real-time

🔄 **Integrasi Cloud**
- Sync data dengan Supabase
- Historical data retrieval
- Data persistence

## Prasyarat

- Node.js 18+ dan npm/yarn/pnpm
- Akun Supabase (free tier tersedia)
- HiveMQ Public Broker (gratis, tidak perlu konfigurasi)
- ESP32 dengan firmware yang sudah dikonfigurasi

## Instalasi

1. **Clone atau navigate ke folder dashboard**
```bash
cd dashboard
```

2. **Install dependencies**
```bash
npm install
# atau
yarn install
# atau
pnpm install
```

3. **Konfigurasi environment variables**

Salin `.env.example` ke `.env.local` dan isi dengan kredensial Anda:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# HiveMQ MQTT Configuration
VITE_MQTT_BROKER_URL=wss://broker.hivemq.com:8884/mqtt
VITE_MQTT_CLIENT_ID=fishfeeder-dashboard
VITE_MQTT_USERNAME=       # Kosongkan jika public broker
VITE_MQTT_PASSWORD=       # Kosongkan jika public broker

# Device Configuration
VITE_DEVICE_ID=00:00:00:00:00:00
VITE_API_BASE_URL=http://localhost/fishfeeder/api
```

## Setup Supabase

1. Buat project di [supabase.com](https://supabase.com)
2. Buat tabel berikut di Supabase:

### Tabel: `device_status`
```sql
CREATE TABLE device_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  is_online BOOLEAN DEFAULT false,
  battery_level INT,
  motor_status TEXT CHECK (motor_status IN ('idle', 'running', 'error')),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Tabel: `sensor_data`
```sql
CREATE TABLE sensor_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  temperature NUMERIC,
  humidity NUMERIC,
  water_level NUMERIC,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Tabel: `feeding_records`
```sql
CREATE TABLE feeding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  duration INT NOT NULL,
  manual BOOLEAN DEFAULT true,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Setup HiveMQ MQTT

HiveMQ Public Broker sudah siap digunakan tanpa konfigurasi tambahan:
- **Broker URL**: `wss://broker.hivemq.com:8884/mqtt`
- **Port**: 8884 (WebSocket TLS)
- **Tidak memerlukan autentikasi** (public broker)

### Topics yang digunakan:

```
fishfeeder/device/{device_id}/status      → Device status updates
fishfeeder/device/{device_id}/sensors     → Sensor data
fishfeeder/device/{device_id}/feeding     -> Feeding history
fishfeeder/device/{device_id}/command     -> Manual feed commands
```

## Menjalankan Dashboard

### Development Mode
```bash
npm run dev
```
Buka browser di `http://localhost:5173`

### Build for Production
```bash
npm run build
```
Output ada di folder `dist/`

### Preview Production Build
```bash
npm run preview
```

## Struktur Project

```
dashboard/
├── src/
│   ├── components/          # React components
│   │   ├── Header.tsx       # Header dengan status
│   │   ├── DeviceStatus.tsx # Info device
│   │   ├── FeedingControl.tsx # Kontrol pemberi pakan
│   │   ├── SensorChart.tsx  # Grafik sensor
│   │   └── FeedingHistory.tsx # Riwayat pakan
│   ├── lib/
│   │   ├── supabase.ts      # Konfigurasi Supabase
│   │   └── mqtt.ts          # MQTT client manager
│   ├── store/
│   │   └── dashboard.ts     # Zustand store
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── .env.example             # Template env variables
├── .env.local               # Local env variables (git ignored)
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── vite.config.ts           # Vite config
└── index.html               # HTML entry point
```

## Integrasi dengan ESP32

Pastikan ESP32 firmware Anda mengirimkan MQTT messages ke topics yang sesuai:

### Contoh publish dari ESP32:

```cpp
// Device status
{
  "device_id": 1,
  "is_online": true,
  "battery_level": 85,
  "motor_status": "idle",
  "last_seen": "2024-01-01T12:00:00Z"
}

// Sensor data
{
  "device_id": 1,
  "temperature": 28.5,
  "humidity": 65.2,
  "water_level": 75,
  "timestamp": "2024-01-01T12:00:00Z"
}

// Feeding record
{
  "device_id": 1,
  "timestamp": "2024-01-01T12:00:00Z",
  "duration": 5,
  "manual": true,
  "status": "completed"
}
```

## API Endpoints

Jika menggunakan REST API (optional):
- `GET /api/status.php?device=1` → Device status
- `POST /api/feed.php` → Trigger feeding
- `GET /api/history.php?device=1` → Feeding history

## Troubleshooting

### MQTT tidak terhubung
- Pastikan browser mendukung WebSocket
- Periksa firewall atau proxy settings
- Cek console browser untuk error messages

### Data Supabase tidak muncul
- Verifikasi credentials di `.env.local`
- Pastikan tabel sudah dibuat dengan benar
- Cek permissions di Supabase dashboard

### Dashboard tidak load
- Clear cache browser (Ctrl+Shift+Delete)
- Cek console browser untuk error messages
- Pastikan semua dependencies terinstall (`npm install`)

## Development Tips

- Gunakan Redux DevTools untuk debug state management
- Buka DevTools browser untuk monitoring network
- Gunakan Supabase dashboard untuk melihat data real-time
- Test MQTT dengan tools seperti MQTT Explorer

## Performance Optimization

- Grafik dibatasi ke 50 data points terakhir
- Riwayat pemberian dibatasi ke 50 records terakhir
- Sensor data disimpan max 100 items di memory
- Lazy loading components jika perlu

## Lisensi

MIT

## Support

Untuk issues atau pertanyaan:
1. Check dokumentasi di atas
2. Lihat console browser untuk error messages
3. Pastikan konfigurasi environment variables benar
4. Cek status HiveMQ di https://www.hivemq.com/public-mqtt-broker/

---

**Happy Monitoring! 🐠📊**
