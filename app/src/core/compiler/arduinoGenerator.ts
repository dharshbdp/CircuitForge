import * as Blockly from 'blockly'
import { validatePwmPin, validateSerialPin } from '@core/validation'

export const Order = {
  ATOMIC: 0,
  POSTFIX: 1,
  UNARY: 2,
  MULTIPLICATIVE: 3,
  ADDITIVE: 4,
  SHIFT: 5,
  RELATIONAL: 6,
  EQUALITY: 7,
  BITWISE_AND: 8,
  BITWISE_XOR: 9,
  BITWISE_OR: 10,
  LOGICAL_AND: 11,
  LOGICAL_OR: 12,
  CONDITIONAL: 13,
  ASSIGNMENT: 14,
  NONE: 99
} as const

export class ArduinoGenerator extends Blockly.CodeGenerator {
  definitions_: Record<string, string> = Object.create(null)
  includes_: Record<string, string> = Object.create(null)
  setups_: Record<string, string> = Object.create(null)
  ORDER_NONE: number
  ORDER_ATOMIC: number

  constructor() {
    super('Arduino')
    this.INDENT = '  '
    this.ORDER_ATOMIC = Order.ATOMIC
    this.ORDER_NONE = Order.NONE

    this.initHardwareGenerators()
    this.initStandardGenerators()
  }

  override init(workspace: Blockly.Workspace): void {
    super.init(workspace)
    this.definitions_ = Object.create(null)
    this.includes_ = Object.create(null)
    this.setups_ = Object.create(null)
  }

  override finish(code: string): string {
    const includes = Object.values(this.includes_).join('\n')
    const defs = Object.values(this.definitions_).join('\n')
    const setups = Object.values(this.setups_).join('\n  ')

    const loopCode = code ? code : '  delay(10);\n'

    return [
      '// ==========================================',
      '// CircuitForge v0.2 — Generated Sketch',
      '// Target: Arduino Compatible (C++)',
      '// ==========================================',
      '',
      includes ? includes + '\n' : '',
      defs ? defs + '\n' : '',
      'void setup() {',
      '  ' + (setups || '// System setup'),
      '}',
      '',
      'void loop() {',
      loopCode.endsWith('\n') ? loopCode.slice(0, -1) : loopCode,
      '}',
      ''
    ]
      .filter((line) => line !== null && line !== undefined)
      .join('\n')
  }

  override scrub_(block: Blockly.Block, code: string, thisOnly?: boolean): string {
    const nextBlock = block.nextConnection && block.nextConnection.targetBlock()
    if (nextBlock && !thisOnly) {
      return code + this.blockToCode(nextBlock)
    }
    return code
  }

  private initHardwareGenerators(): void {
    // 1. Digital Write
    this.forBlock['pin_digital_write'] = (block) => {
      const pin = block.getFieldValue('PIN')
      const state = block.getFieldValue('STATE')
      const serialCheck = validateSerialPin(pin)
      if (typeof block.setWarningText === 'function') {
        block.setWarningText(serialCheck.warning ? serialCheck.warning : null)
      }
      this.setups_[`pin_mode_${pin}`] = `pinMode(${pin}, OUTPUT);`
      return `  digitalWrite(${pin}, ${state});\n`
    }

    // 2. Digital Read
    this.forBlock['pin_digital_read'] = (block) => {
      const pin = block.getFieldValue('PIN')
      this.setups_[`pin_mode_${pin}`] = `pinMode(${pin}, INPUT);`
      return [`digitalRead(${pin})`, Order.ATOMIC]
    }

    // 3. Analog Write (PWM)
    this.forBlock['pin_analog_write'] = (block) => {
      const pin = block.getFieldValue('PIN')
      const value = this.valueToCode(block, 'VALUE', Order.NONE) || '0'
      const validation = validatePwmPin(pin)
      if (typeof block.setWarningText === 'function') {
        block.setWarningText(validation.isValid ? null : (validation.warning ?? null))
      }
      const warningComment =
        !validation.isValid && validation.warning ? `  // WARNING: ${validation.warning}\n` : ''
      this.setups_[`pin_mode_${pin}`] = `pinMode(${pin}, OUTPUT);`
      return `${warningComment}  analogWrite(${pin}, ${value});\n`
    }

    // 4. Analog Read
    this.forBlock['pin_analog_read'] = (block) => {
      const pin = block.getFieldValue('PIN')
      return [`analogRead(${pin})`, Order.ATOMIC]
    }

    // 5. Pin Mode
    this.forBlock['pin_set_mode'] = (block) => {
      const pin = block.getFieldValue('PIN')
      const mode = block.getFieldValue('MODE')
      this.setups_[`pin_mode_${pin}`] = `pinMode(${pin}, ${mode});`
      return ''
    }

    // 6. Wait Milliseconds
    this.forBlock['time_delay'] = (block) => {
      const ms = this.valueToCode(block, 'DELAY_MS', Order.NONE) || '1000'
      return `  delay(${ms});\n`
    }

    // 7. Wait Microseconds
    this.forBlock['time_delay_micros'] = (block) => {
      const us = this.valueToCode(block, 'DELAY_US', Order.NONE) || '100'
      return `  delayMicroseconds(${us});\n`
    }

    // 8. Runtime Millis
    this.forBlock['time_millis'] = () => {
      return ['millis()', Order.ATOMIC]
    }

    // 9. Ultrasonic Distance Sensor (HC-SR04)
    this.forBlock['sensor_ultrasonic'] = (block) => {
      const trig = block.getFieldValue('TRIG_PIN')
      const echo = block.getFieldValue('ECHO_PIN')

      this.definitions_['func_read_ultrasonic'] = [
        'long readUltrasonicDistance(int triggerPin, int echoPin) {',
        '  pinMode(triggerPin, OUTPUT);',
        '  digitalWrite(triggerPin, LOW);',
        '  delayMicroseconds(2);',
        '  digitalWrite(triggerPin, HIGH);',
        '  delayMicroseconds(10);',
        '  digitalWrite(triggerPin, LOW);',
        '  pinMode(echoPin, INPUT);',
        '  return pulseIn(echoPin, HIGH) * 0.034 / 2;',
        '}'
      ].join('\n')

      return [`readUltrasonicDistance(${trig}, ${echo})`, Order.ATOMIC]
    }

    // 10. Servo Motor
    this.forBlock['actuator_servo'] = (block) => {
      const pin = block.getFieldValue('PIN')
      const angle = this.valueToCode(block, 'ANGLE', Order.NONE) || '90'

      this.includes_['include_servo'] = '#include <Servo.h>'
      this.definitions_[`servo_${pin}`] = `Servo servo_${pin};`
      this.setups_[`servo_attach_${pin}`] = `servo_${pin}.attach(${pin});`

      return `  servo_${pin}.write(${angle});\n`
    }

    // 11. Relay Switch
    this.forBlock['actuator_relay'] = (block) => {
      const pin = block.getFieldValue('PIN')
      const state = block.getFieldValue('STATE')
      this.setups_[`relay_${pin}`] = `pinMode(${pin}, OUTPUT);`
      return `  digitalWrite(${pin}, ${state});\n`
    }

    // 12. Serial Print
    this.forBlock['serial_print'] = (block) => {
      const content = this.valueToCode(block, 'CONTENT', Order.NONE) || '""'
      const newline = block.getFieldValue('NEWLINE') === 'TRUE'
      this.setups_['serial_begin'] = 'Serial.begin(115200);'
      const func = newline ? 'Serial.println' : 'Serial.print'
      return `  ${func}(${content});\n`
    }

    // 13. DHT11 / DHT22 Sensor
    this.forBlock['sensor_dht'] = (block) => {
      const model = block.getFieldValue('MODEL')
      const pin = block.getFieldValue('PIN')
      const metric = block.getFieldValue('METRIC')

      this.includes_['include_dht'] = '#include <DHT.h>'
      this.definitions_[`dht_${pin}`] = `DHT dht_${pin}(${pin}, ${model});`
      this.setups_[`dht_begin_${pin}`] = `dht_${pin}.begin();`

      if (metric === 'TEMP_C') {
        return [`dht_${pin}.readTemperature()`, Order.ATOMIC]
      } else if (metric === 'TEMP_F') {
        return [`dht_${pin}.readTemperature(true)`, Order.ATOMIC]
      } else {
        return [`dht_${pin}.readHumidity()`, Order.ATOMIC]
      }
    }

    // 14. LDR Light Sensor
    this.forBlock['sensor_light_ldr'] = (block) => {
      const pin = block.getFieldValue('PIN')
      const mode = block.getFieldValue('MODE')

      if (mode === 'PERCENT') {
        return [`map(analogRead(${pin}), 0, 1023, 0, 100)`, Order.ATOMIC]
      }
      return [`analogRead(${pin})`, Order.ATOMIC]
    }

    // 15. PIR Motion Sensor
    this.forBlock['sensor_pir'] = (block) => {
      const pin = block.getFieldValue('PIN')
      this.setups_[`pin_mode_${pin}`] = `pinMode(${pin}, INPUT);`
      return [`(digitalRead(${pin}) == HIGH)`, Order.EQUALITY]
    }

    // 16. NeoPixel Init
    this.forBlock['neopixel_init'] = (block) => {
      const pin = block.getFieldValue('PIN')
      const count = this.valueToCode(block, 'COUNT', Order.NONE) || '8'

      this.includes_['include_neopixel'] = '#include <Adafruit_NeoPixel.h>'
      this.definitions_[`neopixel_${pin}`] =
        `Adafruit_NeoPixel strip_${pin}(${count}, ${pin}, NEO_GRB + NEO_KHZ800);`
      this.setups_[`neopixel_begin_${pin}`] = `strip_${pin}.begin();\n  strip_${pin}.show();`

      return `  // NeoPixel strip_${pin} initialized with ${count} pixels\n`
    }

    // 17. NeoPixel Set Pixel Color
    this.forBlock['neopixel_set_color'] = (block) => {
      const pin = block.getFieldValue('PIN')
      const pixel = this.valueToCode(block, 'PIXEL', Order.NONE) || '0'
      const red = this.valueToCode(block, 'RED', Order.NONE) || '255'
      const green = this.valueToCode(block, 'GREEN', Order.NONE) || '0'
      const blue = this.valueToCode(block, 'BLUE', Order.NONE) || '0'

      this.includes_['include_neopixel'] = '#include <Adafruit_NeoPixel.h>'
      if (!this.definitions_[`neopixel_${pin}`]) {
        this.definitions_[`neopixel_${pin}`] =
          `Adafruit_NeoPixel strip_${pin}(8, ${pin}, NEO_GRB + NEO_KHZ800);`
        this.setups_[`neopixel_begin_${pin}`] = `strip_${pin}.begin();\n  strip_${pin}.show();`
      }

      return `  strip_${pin}.setPixelColor(${pixel}, strip_${pin}.Color(${red}, ${green}, ${blue}));\n  strip_${pin}.show();\n`
    }

    // 18. NeoPixel Clear
    this.forBlock['neopixel_clear'] = (block) => {
      const pin = block.getFieldValue('PIN')

      this.includes_['include_neopixel'] = '#include <Adafruit_NeoPixel.h>'
      if (!this.definitions_[`neopixel_${pin}`]) {
        this.definitions_[`neopixel_${pin}`] =
          `Adafruit_NeoPixel strip_${pin}(8, ${pin}, NEO_GRB + NEO_KHZ800);`
        this.setups_[`neopixel_begin_${pin}`] = `strip_${pin}.begin();\n  strip_${pin}.show();`
      }

      return `  strip_${pin}.clear();\n  strip_${pin}.show();\n`
    }
  }

  private initStandardGenerators(): void {
    // Logic: Boolean
    this.forBlock['logic_boolean'] = (block) => {
      return [block.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false', Order.ATOMIC]
    }

    // Logic: Compare
    this.forBlock['logic_compare'] = (block) => {
      const op = block.getFieldValue('OP')
      const ops: Record<string, [string, number]> = {
        EQ: ['==', Order.EQUALITY],
        NEQ: ['!=', Order.EQUALITY],
        LT: ['<', Order.RELATIONAL],
        LTE: ['<=', Order.RELATIONAL],
        GT: ['>', Order.RELATIONAL],
        GTE: ['>=', Order.RELATIONAL]
      }
      const tuple = ops[op] || ['==', Order.EQUALITY]
      const a = this.valueToCode(block, 'A', tuple[1]) || '0'
      const b = this.valueToCode(block, 'B', tuple[1]) || '0'
      return [`${a} ${tuple[0]} ${b}`, tuple[1]]
    }

    // Logic: Operation (AND/OR)
    this.forBlock['logic_operation'] = (block) => {
      const op = block.getFieldValue('OP') === 'AND' ? '&&' : '||'
      const order = op === '&&' ? Order.LOGICAL_AND : Order.LOGICAL_OR
      const a = this.valueToCode(block, 'A', order) || 'false'
      const b = this.valueToCode(block, 'B', order) || 'false'
      return [`${a} ${op} ${b}`, order]
    }

    // Logic: Negate
    this.forBlock['logic_negate'] = (block) => {
      const a = this.valueToCode(block, 'BOOL', Order.UNARY) || 'false'
      return [`!${a}`, Order.UNARY]
    }

    // Controls: If
    this.forBlock['controls_if'] = (block) => {
      let n = 0
      let code = ''
      let branchCode: string
      let conditionCode: string

      do {
        conditionCode = this.valueToCode(block, 'IF' + n, Order.NONE) || 'false'
        branchCode = this.statementToCode(block, 'DO' + n)
        code += `${n > 0 ? ' else ' : '  '}if (${conditionCode}) {\n${branchCode}  }`
        n++
      } while (block.getInput('IF' + n))

      if (block.getInput('ELSE')) {
        branchCode = this.statementToCode(block, 'ELSE')
        code += ` else {\n${branchCode}  }`
      }

      return code + '\n'
    }

    // Loops: Repeat / For
    this.forBlock['controls_repeat_ext'] = (block) => {
      const repeats = this.valueToCode(block, 'TIMES', Order.ASSIGNMENT) || '0'
      const branch = this.statementToCode(block, 'DO')
      const loopVar = 'i'
      return `  for (int ${loopVar} = 0; ${loopVar} < ${repeats}; ${loopVar}++) {\n${branch}  }\n`
    }

    // Loops: While
    this.forBlock['controls_whileUntil'] = (block) => {
      const until = block.getFieldValue('MODE') === 'UNTIL'
      let argument0 = this.valueToCode(block, 'BOOL', Order.NONE) || 'false'
      if (until) {
        argument0 = `!(${argument0})`
      }
      const branch = this.statementToCode(block, 'DO')
      return `  while (${argument0}) {\n${branch}  }\n`
    }

    // Math: Number
    this.forBlock['math_number'] = (block) => {
      const code = String(Number(block.getFieldValue('NUM')))
      return [code, Order.ATOMIC]
    }

    // Math: Arithmetic (+, -, *, /, ^)
    this.forBlock['math_arithmetic'] = (block) => {
      const operators: Record<string, [string, number]> = {
        ADD: [' + ', Order.ADDITIVE],
        MINUS: [' - ', Order.ADDITIVE],
        MULTIPLY: [' * ', Order.MULTIPLICATIVE],
        DIVIDE: [' / ', Order.MULTIPLICATIVE]
      }
      const tuple = operators[block.getFieldValue('OP')] || [' + ', Order.ADDITIVE]
      const a = this.valueToCode(block, 'A', tuple[1]) || '0'
      const b = this.valueToCode(block, 'B', tuple[1]) || '0'
      return [`${a}${tuple[0]}${b}`, tuple[1]]
    }

    // Text: Raw string
    this.forBlock['text'] = (block) => {
      const text = block.getFieldValue('TEXT') || ''
      return [`"${text}"`, Order.ATOMIC]
    }

    // Text: Print to Serial
    this.forBlock['text_print'] = (block) => {
      const msg = this.valueToCode(block, 'TEXT', Order.NONE) || '""'
      this.setups_['serial_begin'] = 'Serial.begin(115200);'
      return `  Serial.println(${msg});\n`
    }

    // Loops: Count with (for loop)
    this.forBlock['controls_for'] = (block) => {
      const variable = block.getField('VAR')?.getText() || 'i'
      const from = this.valueToCode(block, 'FROM', Order.ASSIGNMENT) || '0'
      const to = this.valueToCode(block, 'TO', Order.ASSIGNMENT) || '0'
      const by = this.valueToCode(block, 'BY', Order.ASSIGNMENT) || '1'
      const branch = this.statementToCode(block, 'DO')
      return `  for (long ${variable} = ${from}; ${variable} <= ${to}; ${variable} += ${by}) {\n${branch}  }\n`
    }

    // Math: Single operations (abs, sqrt, log, etc.)
    this.forBlock['math_single'] = (block) => {
      const operator = block.getFieldValue('OP')
      let code: string
      let arg: string
      if (operator === 'NEG') {
        arg = this.valueToCode(block, 'NUM', Order.UNARY) || '0'
        return [`-${arg}`, Order.UNARY]
      }
      arg = this.valueToCode(block, 'NUM', Order.NONE) || '0'
      switch (operator) {
        case 'ABS':
          code = `abs(${arg})`
          break
        case 'ROOT':
          code = `sqrt(${arg})`
          break
        case 'LN':
          code = `log(${arg})`
          break
        case 'LOG10':
          code = `log10(${arg})`
          break
        case 'EXP':
          code = `exp(${arg})`
          break
        case 'POW10':
          code = `pow(10, ${arg})`
          break
        default:
          code = `0`
      }
      return [code, Order.UNARY]
    }

    // Variables: Get
    this.forBlock['variables_get'] = (block) => {
      const varName = block.getField('VAR')?.getText() || 'var'
      return [varName, Order.ATOMIC]
    }

    // Variables: Set
    this.forBlock['variables_set'] = (block) => {
      const varName = block.getField('VAR')?.getText() || 'var'
      const value = this.valueToCode(block, 'VALUE', Order.ASSIGNMENT) || '0'
      this.definitions_[`var_${varName}`] = `long ${varName} = 0;`
      return `  ${varName} = ${value};\n`
    }
  }
}

export const arduinoGenerator = new ArduinoGenerator()
