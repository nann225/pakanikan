/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string | undefined
  readonly VITE_SUPABASE_ANON_KEY: string | undefined
  readonly VITE_MQTT_BROKER_URL: string | undefined
  readonly VITE_MQTT_CLIENT_ID: string | undefined
  readonly VITE_MQTT_USERNAME: string | undefined
  readonly VITE_MQTT_PASSWORD: string | undefined
  readonly VITE_DEVICE_ID: string | undefined
  readonly VITE_API_BASE_URL: string | undefined
  readonly VITE_REQUIRE_AUTH: string | undefined
  readonly VITE_NEXT_FEED_TIME: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
