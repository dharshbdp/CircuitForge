export * from './arduino/arduinoUno'
export * from './esp32/esp32DevKit'
export * from './rp2040/piPico'
export * from './sensors/sensorDefs'

import { ARDUINO_UNO_PROFILE } from './arduino/arduinoUno'
import { ESP32_DEVKIT_PROFILE } from './esp32/esp32DevKit'
import { RASPBERRY_PI_PICO_PROFILE } from './rp2040/piPico'

export interface BoardProfile {
  id: string
  name: string
  architecture: string
  fqbn: string
  voltage: number
  defaultBaudRate: number
  hasWifi?: boolean
  hasBluetooth?: boolean
}

export const SUPPORTED_BOARDS: BoardProfile[] = [
  ARDUINO_UNO_PROFILE,
  ESP32_DEVKIT_PROFILE,
  RASPBERRY_PI_PICO_PROFILE
]
