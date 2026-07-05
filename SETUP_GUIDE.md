# Quick Setup Guide 🚀

## Step-by-Step Setup

### 1. Install Dependencies
```bash
cd dashboard
npm install
```

### 2. Configure Environment Variables

Copy dan edit `.env.local`:
```bash
cp .env.example .env.local
```

**Minimal Configuration untuk Testing:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DEVICE_ID=1
```

MQTT broker (HiveMQ) sudah terisi default dan tidak perlu perubahan untuk public broker.

### 3. Setup Supabase (Optional untuk development)

Jika ingin menggunakan data persistence:

1. Buat akun di https://supabase.com
2. Copy URL dan Anon Key ke `.env.local`
3. Buat tabel dengan SQL queries di `README.md`

### 4. Run Development Server
```bash
npm run dev
```

Dashboard akan terbuka di `http://localhost:5173`

### 5. Configure ESP32

Update `fishfeeder_esp32.ino` untuk publish ke MQTT topics:

```cpp
// Contoh publish sensor data setiap 5 detik:
void publishSensorData() {
  DynamicJsonDocument doc(512);
  doc["device_id"] = 1;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["water_level"] = waterLevel;
  doc["timestamp"] = getCurrentTimestamp();
  
  String json;
  serializeJson(doc, json);
  client.publish("fishfeeder/device/1/sensors", json.c_str());
}

// Subscribe ke feed commands:
void callback(char* topic, byte* payload, unsigned int length) {
  DynamicJsonDocument doc(256);
  deserializeJson(doc, payload, length);
  
  if (doc["feed"] == true) {
    int duration = doc["duration"];
    activateMotor(duration);
  }
}
```

## Quick Testing

Jika belum punya ESP32 yang siap, test dengan MQTT client simulator:

### Option 1: MQTT Explorer
1. Download MQTT Explorer
2. Connect ke `broker.hivemq.com`
3. Publish test message ke `fishfeeder/device/1/sensors`

### Option 2: Mosquitto CLI
```bash
# Subscribe
mosquitto_sub -h broker.hivemq.com -p 1883 -t "fishfeeder/device/1/#"

# Publish test data
mosquitto_pub -h broker.hivemq.com -p 1883 -t "fishfeeder/device/1/sensors" \
  -m '{"device_id":1,"temperature":28.5,"humidity":65,"water_level":75,"timestamp":"2024-01-01T12:00:00Z"}'
```

## File Structure Overview

```
dashboard/
├── src/
│   ├── components/     ← React UI components
│   ├── lib/            ← Supabase & MQTT utilities
│   ├── store/          ← Global state (Zustand)
│   ├── App.tsx         ← Main application logic
│   └── main.tsx        ← Entry point
├── .env.local          ← Your credentials (git ignored)
├── package.json        ← Dependencies
└── README.md           ← Full documentation
```

## Production Deployment

### Build
```bash
npm run build
```

### Deploy to Netlify
```bash
npm run build
# Deploy 'dist' folder to Netlify
```

### Deploy to Vercel
```bash
npm run build
# Push to GitHub, auto-deploy via Vercel integration
```

### Deploy to Apache (XAMPP)
```bash
npm run build
# Copy 'dist' folder contents to c:\xampp\htdocs\dashboard\
```

## Common Issues

**Issue**: "MQTT connection failed"
- Solution: Periksa VITE_MQTT_BROKER_URL di .env.local
- HiveMQ free tier: `wss://broker.hivemq.com:8884/mqtt`

**Issue**: "Supabase error"
- Solution: Verifikasi URL dan Anon Key
- Pastikan credentials tidak expired

**Issue**: "No data appearing"
- Solution 1: Cek console browser (F12 → Console)
- Solution 2: Publish test MQTT message
- Solution 3: Restart dev server

## Next Steps

1. ✅ Setup dashboard
2. ✅ Configure ESP32 firmware
3. ✅ Setup Supabase tables
4. 🔄 Test MQTT connections
5. 📊 Monitor data in dashboard
6. 🚀 Deploy to production

## Support Resources

- **HiveMQ Public Broker**: https://www.hivemq.com/public-mqtt-broker/
- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **MQTT Protocol**: https://mqtt.org/

---

Siap? Jalankan `npm run dev` dan lihat dashboard Anda live! 🎉
