import mqtt, { MqttClient } from 'mqtt'

export interface MQTTMessage {
  topic: string
  payload: string
  qos: number
  retain: boolean
}

class MQTTManager {
  private client: MqttClient | null = null
  private messageHandlers: Map<string, (payload: string) => void> = new Map()
  private connectionCallbacks: ((connected: boolean) => void)[] = []

  async connect(): Promise<void> {
    const brokerUrl = import.meta.env.VITE_MQTT_BROKER_URL
    const clientId = import.meta.env.VITE_MQTT_CLIENT_ID

    if (!brokerUrl) {
      console.error('MQTT broker URL not configured')
      throw new Error('MQTT broker URL not configured')
    }

    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(brokerUrl, {
        clientId: `${clientId}-${Date.now()}`,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000,
        username: import.meta.env.VITE_MQTT_USERNAME || undefined,
        password: import.meta.env.VITE_MQTT_PASSWORD || undefined,
      })

      this.client.on('connect', () => {
        console.log('MQTT Connected')
        this.notifyConnectionChange(true)
        resolve()
      })

      this.client.on('message', (topic: string, payload: Buffer) => {
        const handler = this.messageHandlers.get(topic)
        if (handler) {
          handler(payload.toString())
        }
      })

      this.client.on('error', (error) => {
        console.error('MQTT Error:', error)
        reject(error)
      })

      this.client.on('disconnect', () => {
        console.log('MQTT Disconnected')
        this.notifyConnectionChange(false)
      })

      this.client.on('offline', () => {
        console.log('MQTT Offline')
        this.notifyConnectionChange(false)
      })
    })
  }

  disconnect(): void {
    if (this.client) {
      this.client.end()
      this.client = null
    }
  }

  subscribe(topic: string, callback: (payload: string) => void): void {
    if (!this.client) {
      console.error('MQTT client not connected')
      return
    }
    
    this.messageHandlers.set(topic, callback)
    this.client.subscribe(topic, { qos: 1 }, (error) => {
      if (error) {
        console.error(`Failed to subscribe to ${topic}:`, error)
      } else {
        console.log(`Subscribed to ${topic}`)
      }
    })
  }

  unsubscribe(topic: string): void {
    if (!this.client) return
    
    this.messageHandlers.delete(topic)
    this.client.unsubscribe(topic, (error) => {
      if (error) {
        console.error(`Failed to unsubscribe from ${topic}:`, error)
      }
    })
  }

  publish(topic: string, message: string, retain = false): void {
    if (!this.client) {
      console.error('MQTT client not connected')
      return
    }

    this.client.publish(topic, message, { qos: 1, retain }, (error) => {
      if (error) {
        console.error(`Failed to publish to ${topic}:`, error)
      }
    })
  }

  onConnectionChange(callback: (connected: boolean) => void): void {
    this.connectionCallbacks.push(callback)
  }

  private notifyConnectionChange(connected: boolean): void {
    this.connectionCallbacks.forEach(callback => callback(connected))
  }

  isConnected(): boolean {
    return this.client?.connected || false
  }
}

export const mqttManager = new MQTTManager()
