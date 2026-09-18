export const ESP32_DEVKIT_GPIO_PINS: [string, string][] = [
  ['GPIO 2 (LED)', '2'],
  ['GPIO 4', '4'],
  ['GPIO 5', '5'],
  ['GPIO 12', '12'],
  ['GPIO 13', '13'],
  ['GPIO 14', '14'],
  ['GPIO 15', '15'],
  ['GPIO 16 (RX2)', '16'],
  ['GPIO 17 (TX2)', '17'],
  ['GPIO 18 (SCK)', '18'],
  ['GPIO 19 (MISO)', '19'],
  ['GPIO 21 (SDA)', '21'],
  ['GPIO 22 (SCL)', '22'],
  ['GPIO 23 (MOSI)', '23'],
  ['GPIO 25 (DAC1)', '25'],
  ['GPIO 26 (DAC2)', '26'],
  ['GPIO 27', '27'],
  ['GPIO 32 (ADC4)', '32'],
  ['GPIO 33 (ADC5)', '33'],
  ['GPIO 34 (In Only)', '34'],
  ['GPIO 35 (In Only)', '35']
]

export const ESP32_DEVKIT_PROFILE = {
  id: 'esp32_devkit',
  name: 'ESP32 Dev Module',
  architecture: 'esp32',
  fqbn: 'esp32:esp32:esp32',
  voltage: 3.3,
  defaultBaudRate: 115200,
  pins: ESP32_DEVKIT_GPIO_PINS,
  hasWifi: true,
  hasBluetooth: true
} as const
