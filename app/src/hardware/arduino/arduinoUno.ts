export interface PinDescriptor {
  name: string
  value: string
  isPwm?: boolean
  isAnalog?: boolean
  description?: string
}

export const ARDUINO_UNO_DIGITAL_PINS: [string, string][] = [
  ['D0 (RX)', '0'],
  ['D1 (TX)', '1'],
  ['D2', '2'],
  ['D3 (~PWM)', '3'],
  ['D4', '4'],
  ['D5 (~PWM)', '5'],
  ['D6 (~PWM)', '6'],
  ['D7', '7'],
  ['D8', '8'],
  ['D9 (~PWM)', '9'],
  ['D10 (~PWM)', '10'],
  ['D11 (~PWM)', '11'],
  ['D12', '12'],
  ['D13 (LED)', '13']
]

export const ARDUINO_UNO_ANALOG_PINS: [string, string][] = [
  ['A0', 'A0'],
  ['A1', 'A1'],
  ['A2', 'A2'],
  ['A3', 'A3'],
  ['A4 (SDA)', 'A4'],
  ['A5 (SCL)', 'A5']
]

export const ARDUINO_UNO_PROFILE = {
  id: 'arduino_uno',
  name: 'Arduino Uno R3',
  architecture: 'avr',
  fqbn: 'arduino:avr:uno',
  voltage: 5.0,
  defaultBaudRate: 115200,
  digitalPins: ARDUINO_UNO_DIGITAL_PINS,
  analogPins: ARDUINO_UNO_ANALOG_PINS,
  pwmPins: ['3', '5', '6', '9', '10', '11']
} as const
