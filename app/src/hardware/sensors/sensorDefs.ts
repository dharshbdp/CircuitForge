export interface SensorDefinition {
  id: string
  name: string
  category: 'sensor' | 'actuator' | 'display'
  library?: string
  pinsRequired: number
  description: string
}

export const SUPPORTED_SENSORS: Record<string, SensorDefinition> = {
  ultrasonic: {
    id: 'ultrasonic',
    name: 'Ultrasonic Distance (HC-SR04)',
    category: 'sensor',
    pinsRequired: 2,
    description: 'Measures distances from 2cm to 400cm using high-frequency sound waves.'
  },
  dht11: {
    id: 'dht11',
    name: 'Temperature & Humidity (DHT11)',
    category: 'sensor',
    library: 'DHT sensor library',
    pinsRequired: 1,
    description: 'Basic temperature and relative humidity sensor with single-bus digital output.'
  },
  dht22: {
    id: 'dht22',
    name: 'Temperature & Humidity (DHT22 / AM2302)',
    category: 'sensor',
    library: 'DHT sensor library',
    pinsRequired: 1,
    description: 'High-precision temperature and relative humidity sensor.'
  },
  ldr: {
    id: 'ldr',
    name: 'Ambient Light (LDR / Photoresistor)',
    category: 'sensor',
    pinsRequired: 1,
    description: 'Analog light-dependent resistor sensor measuring relative brightness.'
  },
  pir: {
    id: 'pir',
    name: 'PIR Motion Sensor (HC-SR501)',
    category: 'sensor',
    pinsRequired: 1,
    description: 'Passive infrared sensor detecting human/object motion.'
  },
  mq2: {
    id: 'mq2',
    name: 'Gas & Smoke Sensor (MQ-2)',
    category: 'sensor',
    pinsRequired: 1,
    description:
      'Measures concentrations of combustible gases (LPG, smoke, methane, butane, alcohol) via analog and digital outputs.'
  },
  servo: {
    id: 'servo',
    name: 'Micro Servo Motor (SG90)',
    category: 'actuator',
    library: 'Servo',
    pinsRequired: 1,
    description: 'Positional servo motor with 0 to 180 degree rotation control.'
  },
  relay: {
    id: 'relay',
    name: '5V / 3.3V Relay Switch Module',
    category: 'actuator',
    pinsRequired: 1,
    description: 'Electromechanical relay for switching external high-voltage/current loads.'
  },
  neopixel: {
    id: 'neopixel',
    name: 'WS2812B Addressable RGB LED Strip / Ring',
    category: 'display',
    library: 'Adafruit NeoPixel',
    pinsRequired: 1,
    description: 'Individually addressable 24-bit RGB LEDs chained on a single digital pin.'
  }
}
