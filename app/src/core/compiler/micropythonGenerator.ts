import * as Blockly from 'blockly'

export const PythonOrder = {
  ATOMIC: 0,
  COLLECTION: 1,
  STRING_CONVERSION: 1,
  MEMBER: 2.1,
  FUNCTION_CALL: 2.2,
  EXPONENTIATION: 3,
  UNARY_SIGN: 4,
  MULTIPLICATIVE: 5,
  ADDITIVE: 6,
  SHIFT: 7,
  BITWISE_AND: 8,
  BITWISE_XOR: 9,
  BITWISE_OR: 10,
  RELATIONAL: 11,
  LOGICAL_NOT: 12,
  LOGICAL_AND: 13,
  LOGICAL_OR: 14,
  CONDITIONAL: 15,
  LAMBDA: 16,
  NONE: 99
} as const

export class MicroPythonGenerator extends Blockly.CodeGenerator {
  definitions_: Record<string, string> = Object.create(null)
  imports_: Record<string, string> = Object.create(null)
  setups_: Record<string, string> = Object.create(null)
  ORDER_NONE: number
  ORDER_ATOMIC: number

  constructor() {
    super('MicroPython')
    this.INDENT = '  '
    this.ORDER_ATOMIC = PythonOrder.ATOMIC
    this.ORDER_NONE = PythonOrder.NONE

    this.initHardwareGenerators()
    this.initStandardGenerators()
  }

  override init(workspace: Blockly.Workspace): void {
    super.init(workspace)
    this.definitions_ = Object.create(null)
    this.imports_ = Object.create(null)
    this.setups_ = Object.create(null)

    // Base embedded imports
    this.imports_['import_time'] = 'import time'
    this.imports_['import_machine'] = 'from machine import Pin, ADC, PWM'
  }

  override finish(code: string): string {
    const imports = Object.values(this.imports_).join('\n')
    const defs = Object.values(this.definitions_).join('\n\n')
    const setups = Object.values(this.setups_).join('\n')

    const loopCode = code.trim() ? code : '  time.sleep_ms(10)\n'

    return [
      '# ==========================================',
      '# CircuitForge v0.2 — Generated MicroPython',
      '# Target: MicroPython Compatible (ESP32 / RP2040)',
      '# ==========================================',
      '',
      imports,
      '',
      defs ? defs + '\n' : '',
      '# --- Hardware Pin Setup ---',
      setups ? setups : '# Default pin configurations',
      '',
      '# --- Main Execution Loop ---',
      'while True:',
      loopCode.endsWith('\n') ? loopCode.slice(0, -1) : loopCode,
      '  time.sleep_ms(10)',
      ''
    ]
      .filter((line) => line !== null && line !== undefined)
      .join('\n')
  }

  private cleanPin(pin: string): string {
    return pin.replace(/^[A-Za-z]/, '') || pin
  }

  private initHardwareGenerators(): void {
    // 1. Digital Write
    this.forBlock['pin_digital_write'] = (block) => {
      const rawPin = block.getFieldValue('PIN')
      const pin = this.cleanPin(rawPin)
      const state = block.getFieldValue('STATE') === 'HIGH' ? '1' : '0'
      this.setups_[`pin_${pin}`] = `pin_${pin} = Pin(${pin}, Pin.OUT)`
      return `  pin_${pin}.value(${state})\n`
    }

    // 2. Digital Read
    this.forBlock['pin_digital_read'] = (block) => {
      const rawPin = block.getFieldValue('PIN')
      const pin = this.cleanPin(rawPin)
      this.setups_[`pin_${pin}`] = `pin_${pin} = Pin(${pin}, Pin.IN)`
      return [`pin_${pin}.value()`, PythonOrder.FUNCTION_CALL]
    }

    // 3. Analog Write (PWM)
    this.forBlock['pin_analog_write'] = (block) => {
      const rawPin = block.getFieldValue('PIN')
      const pin = this.cleanPin(rawPin)
      const value = this.valueToCode(block, 'VALUE', PythonOrder.NONE) || '0'
      this.setups_[`pwm_${pin}`] = `pwm_${pin} = PWM(Pin(${pin}))\npwm_${pin}.freq(1000)`
      return `  pwm_${pin}.duty_u16(int(min(max(${value}, 0), 255) * 257))\n`
    }

    // 4. Analog Read (ADC)
    this.forBlock['pin_analog_read'] = (block) => {
      const rawPin = block.getFieldValue('PIN')
      const pin = this.cleanPin(rawPin)
      this.setups_[`adc_${pin}`] = `adc_${pin} = ADC(Pin(${pin}))`
      return [`int(adc_${pin}.read_u16() >> 6)`, PythonOrder.FUNCTION_CALL]
    }

    // 5. Pin Mode
    this.forBlock['pin_set_mode'] = (block) => {
      const rawPin = block.getFieldValue('PIN')
      const pin = this.cleanPin(rawPin)
      const mode = block.getFieldValue('MODE')
      const pyMode =
        mode === 'OUTPUT' ? 'Pin.OUT' : mode === 'INPUT_PULLUP' ? 'Pin.IN, Pin.PULL_UP' : 'Pin.IN'
      this.setups_[`pin_${pin}`] = `pin_${pin} = Pin(${pin}, ${pyMode})`
      return ''
    }

    // 6. Delay Milliseconds
    this.forBlock['time_delay'] = (block) => {
      const ms = this.valueToCode(block, 'DELAY_MS', PythonOrder.NONE) || '1000'
      return `  time.sleep_ms(int(${ms}))\n`
    }

    // 7. Delay Microseconds
    this.forBlock['time_delay_micros'] = (block) => {
      const us = this.valueToCode(block, 'DELAY_US', PythonOrder.NONE) || '100'
      return `  time.sleep_us(int(${us}))\n`
    }

    // 8. Runtime Millis
    this.forBlock['time_millis'] = () => {
      return ['time.ticks_ms()', PythonOrder.FUNCTION_CALL]
    }

    // 9. Ultrasonic Distance Sensor (HC-SR04)
    this.forBlock['sensor_ultrasonic'] = (block) => {
      const trig = this.cleanPin(block.getFieldValue('TRIG_PIN'))
      const echo = this.cleanPin(block.getFieldValue('ECHO_PIN'))

      this.definitions_['def_read_ultrasonic'] = [
        'def read_ultrasonic_distance(trig_p, echo_p):',
        '  trig = Pin(trig_p, Pin.OUT)',
        '  echo = Pin(echo_p, Pin.IN)',
        '  trig.value(0)',
        '  time.sleep_us(2)',
        '  trig.value(1)',
        '  time.sleep_us(10)',
        '  trig.value(0)',
        '  pulse = time.time_pulse_us(echo, 1, 30000)',
        '  if pulse > 0:',
        '    return round((pulse / 2) / 29.1, 1)',
        '  return 0.0'
      ].join('\n')

      return [`read_ultrasonic_distance(${trig}, ${echo})`, PythonOrder.FUNCTION_CALL]
    }

    // 10. DHT11/22 Temperature & Humidity
    this.forBlock['sensor_dht'] = (block) => {
      const pin = this.cleanPin(block.getFieldValue('PIN'))
      const sensorType = block.getFieldValue('TYPE') || 'DHT11'
      const readType = block.getFieldValue('READ') || 'TEMPERATURE'

      this.imports_['import_dht'] = 'import dht'
      this.setups_[`dht_${pin}`] = `dht_${pin} = dht.${sensorType}(Pin(${pin}))`

      this.definitions_[`def_read_dht_${sensorType.toLowerCase()}`] = [
        `def get_dht_value(sensor, metric):`,
        '  try:',
        '    sensor.measure()',
        '    return sensor.temperature() if metric == "temp" else sensor.humidity()',
        '  except Exception:',
        '    return 0.0'
      ].join('\n')

      const metricArg = readType === 'HUMIDITY' ? '"hum"' : '"temp"'
      return [`get_dht_value(dht_${pin}, ${metricArg})`, PythonOrder.FUNCTION_CALL]
    }

    // 11. Light Sensor (LDR)
    this.forBlock['sensor_light_ldr'] = (block) => {
      const pin = this.cleanPin(block.getFieldValue('PIN'))
      this.setups_[`ldr_adc_${pin}`] = `ldr_adc_${pin} = ADC(Pin(${pin}))`
      return [`int(ldr_adc_${pin}.read_u16() >> 6)`, PythonOrder.FUNCTION_CALL]
    }

    // 12. PIR Motion Sensor
    this.forBlock['sensor_pir'] = (block) => {
      const pin = this.cleanPin(block.getFieldValue('PIN'))
      this.setups_[`pir_${pin}`] = `pir_${pin} = Pin(${pin}, Pin.IN)`
      return [`(pir_${pin}.value() == 1)`, PythonOrder.RELATIONAL]
    }

    // 13. Servo Motor (0-180 deg)
    this.forBlock['actuator_servo'] = (block) => {
      const pin = this.cleanPin(block.getFieldValue('PIN'))
      const angle = this.valueToCode(block, 'ANGLE', PythonOrder.NONE) || '90'

      this.definitions_['def_set_servo_angle'] = [
        'def set_servo_angle(pwm_obj, deg):',
        '  clamped = max(0, min(180, int(deg)))',
        '  duty = int(1638 + (clamped / 180.0) * (8192 - 1638))',
        '  pwm_obj.duty_u16(duty)'
      ].join('\n')

      this.setups_[`servo_pwm_${pin}`] = `servo_${pin} = PWM(Pin(${pin}), freq=50)`
      return `  set_servo_angle(servo_${pin}, ${angle})\n`
    }

    // 14. Relay Switch
    this.forBlock['actuator_relay'] = (block) => {
      const pin = this.cleanPin(block.getFieldValue('PIN'))
      const state = block.getFieldValue('STATE') === 'HIGH' ? '1' : '0'
      this.setups_[`relay_${pin}`] = `relay_${pin} = Pin(${pin}, Pin.OUT)`
      return `  relay_${pin}.value(${state})\n`
    }

    // 15. NeoPixel WS2812B Init
    this.forBlock['neopixel_init'] = (block) => {
      const pin = this.cleanPin(block.getFieldValue('PIN'))
      const count = this.valueToCode(block, 'COUNT', PythonOrder.NONE) || '8'
      this.imports_['import_neopixel'] = 'import neopixel'
      this.setups_[`np_${pin}`] = `np_${pin} = neopixel.NeoPixel(Pin(${pin}), int(${count}))`
      return ''
    }

    // 16. NeoPixel Set Color
    this.forBlock['neopixel_set_color'] = (block) => {
      const pin = this.cleanPin(block.getFieldValue('PIN'))
      const pixel = this.valueToCode(block, 'PIXEL', PythonOrder.NONE) || '0'
      const r = this.valueToCode(block, 'RED', PythonOrder.NONE) || '255'
      const g = this.valueToCode(block, 'GREEN', PythonOrder.NONE) || '0'
      const b = this.valueToCode(block, 'BLUE', PythonOrder.NONE) || '0'
      this.imports_['import_neopixel'] = 'import neopixel'
      return [
        `  if 'np_${pin}' in globals():`,
        `    np_${pin}[int(${pixel})] = (int(${r}), int(${g}), int(${b}))`,
        `    np_${pin}.write()\n`
      ].join('\n')
    }

    // 17. NeoPixel Clear
    this.forBlock['neopixel_clear'] = (block) => {
      const pin = this.cleanPin(block.getFieldValue('PIN'))
      this.imports_['import_neopixel'] = 'import neopixel'
      return [
        `  if 'np_${pin}' in globals():`,
        `    np_${pin}.fill((0, 0, 0))`,
        `    np_${pin}.write()\n`
      ].join('\n')
    }

    // 18. Serial Print
    this.forBlock['serial_print'] = (block) => {
      const content = this.valueToCode(block, 'CONTENT', PythonOrder.NONE) || '""'
      return `  print(${content})\n`
    }
  }

  private initStandardGenerators(): void {
    // Logic: Boolean
    this.forBlock['logic_boolean'] = (block) => {
      const code = block.getFieldValue('BOOL') === 'TRUE' ? 'True' : 'False'
      return [code, PythonOrder.ATOMIC]
    }

    // Logic: Compare
    this.forBlock['logic_compare'] = (block) => {
      const operators: Record<string, string> = {
        EQ: '==',
        NEQ: '!=',
        LT: '<',
        LTE: '<=',
        GT: '>',
        GTE: '>='
      }
      const op = operators[block.getFieldValue('OP')] || '=='
      const a = this.valueToCode(block, 'A', PythonOrder.RELATIONAL) || '0'
      const b = this.valueToCode(block, 'B', PythonOrder.RELATIONAL) || '0'
      return [`${a} ${op} ${b}`, PythonOrder.RELATIONAL]
    }

    // Logic: Operation (AND / OR)
    this.forBlock['logic_operation'] = (block) => {
      const op = block.getFieldValue('OP') === 'AND' ? 'and' : 'or'
      const order = op === 'and' ? PythonOrder.LOGICAL_AND : PythonOrder.LOGICAL_OR
      const a = this.valueToCode(block, 'A', order) || 'False'
      const b = this.valueToCode(block, 'B', order) || 'False'
      return [`${a} ${op} ${b}`, order]
    }

    // Logic: Negate
    this.forBlock['logic_negate'] = (block) => {
      const a = this.valueToCode(block, 'BOOL', PythonOrder.LOGICAL_NOT) || 'False'
      return [`not ${a}`, PythonOrder.LOGICAL_NOT]
    }

    // Controls: If
    this.forBlock['controls_if'] = (block) => {
      let n = 0
      let code = ''
      let branchCode: string
      let conditionCode: string

      do {
        conditionCode = this.valueToCode(block, 'IF' + n, PythonOrder.NONE) || 'False'
        branchCode = this.statementToCode(block, 'DO' + n)
        const branchBody = branchCode.trim() ? branchCode : '    pass\n'
        code += `${n > 0 ? '  el' : '  '}if ${conditionCode}:\n${branchBody}`
        n++
      } while (block.getInput('IF' + n))

      if (block.getInput('ELSE')) {
        branchCode = this.statementToCode(block, 'ELSE')
        const branchBody = branchCode.trim() ? branchCode : '    pass\n'
        code += `  else:\n${branchBody}`
      }

      return code + '\n'
    }

    // Loops: Repeat
    this.forBlock['controls_repeat_ext'] = (block) => {
      const repeats = this.valueToCode(block, 'TIMES', PythonOrder.NONE) || '0'
      const branch = this.statementToCode(block, 'DO')
      const branchBody = branch.trim() ? branch : '    pass\n'
      return `  for _ in range(int(${repeats})):\n${branchBody}`
    }

    // Loops: While
    this.forBlock['controls_whileUntil'] = (block) => {
      const until = block.getFieldValue('MODE') === 'UNTIL'
      let argument0 = this.valueToCode(block, 'BOOL', PythonOrder.NONE) || 'False'
      if (until) {
        argument0 = `not (${argument0})`
      }
      const branch = this.statementToCode(block, 'DO')
      const branchBody = branch.trim() ? branch : '    pass\n'
      return `  while ${argument0}:\n${branchBody}`
    }

    // Loops: For (Count with)
    this.forBlock['controls_for'] = (block) => {
      const variable = block.getField('VAR')?.getText() || 'i'
      const from = this.valueToCode(block, 'FROM', PythonOrder.NONE) || '0'
      const to = this.valueToCode(block, 'TO', PythonOrder.NONE) || '0'
      const by = this.valueToCode(block, 'BY', PythonOrder.NONE) || '1'
      const branch = this.statementToCode(block, 'DO')
      const branchBody = branch.trim() ? branch : '    pass\n'
      return `  for ${variable} in range(int(${from}), int(${to}) + 1, int(${by})):\n${branchBody}`
    }

    // Math: Number
    this.forBlock['math_number'] = (block) => {
      const code = String(Number(block.getFieldValue('NUM')))
      return [code, PythonOrder.ATOMIC]
    }

    // Math: Arithmetic (+, -, *, /)
    this.forBlock['math_arithmetic'] = (block) => {
      const operators: Record<string, [string, number]> = {
        ADD: [' + ', PythonOrder.ADDITIVE],
        MINUS: [' - ', PythonOrder.ADDITIVE],
        MULTIPLY: [' * ', PythonOrder.MULTIPLICATIVE],
        DIVIDE: [' / ', PythonOrder.MULTIPLICATIVE]
      }
      const tuple = operators[block.getFieldValue('OP')] || [' + ', PythonOrder.ADDITIVE]
      const a = this.valueToCode(block, 'A', tuple[1]) || '0'
      const b = this.valueToCode(block, 'B', tuple[1]) || '0'
      return [`${a}${tuple[0]}${b}`, tuple[1]]
    }

    // Math: Single operations
    this.forBlock['math_single'] = (block) => {
      const operator = block.getFieldValue('OP')
      let code: string
      let arg: string
      if (operator === 'NEG') {
        arg = this.valueToCode(block, 'NUM', PythonOrder.UNARY_SIGN) || '0'
        return [`-${arg}`, PythonOrder.UNARY_SIGN]
      }

      this.imports_['import_math'] = 'import math'
      arg = this.valueToCode(block, 'NUM', PythonOrder.NONE) || '0'
      switch (operator) {
        case 'ABS':
          code = `abs(${arg})`
          break
        case 'ROOT':
          code = `math.sqrt(${arg})`
          break
        case 'LN':
          code = `math.log(${arg})`
          break
        case 'LOG10':
          code = `math.log10(${arg})`
          break
        case 'EXP':
          code = `math.exp(${arg})`
          break
        case 'POW10':
          code = `pow(10, ${arg})`
          break
        default:
          code = '0'
      }
      return [code, PythonOrder.FUNCTION_CALL]
    }

    // Text: Raw string
    this.forBlock['text'] = (block) => {
      const text = block.getFieldValue('TEXT') || ''
      return [`"${text}"`, PythonOrder.ATOMIC]
    }

    // Text: Print to Serial/Console
    this.forBlock['text_print'] = (block) => {
      const msg = this.valueToCode(block, 'TEXT', PythonOrder.NONE) || '""'
      return `  print(${msg})\n`
    }

    // Variables: Get
    this.forBlock['variables_get'] = (block) => {
      const varName = block.getField('VAR')?.getText() || 'var'
      return [varName, PythonOrder.ATOMIC]
    }

    // Variables: Set
    this.forBlock['variables_set'] = (block) => {
      const varName = block.getField('VAR')?.getText() || 'var'
      const value = this.valueToCode(block, 'VALUE', PythonOrder.NONE) || '0'
      return `  ${varName} = ${value}\n`
    }
  }
}

export const micropythonGenerator = new MicroPythonGenerator()
