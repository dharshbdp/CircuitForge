import * as Blockly from 'blockly'

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

    override init(_workspace: Blockly.Workspace): void {
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
            this.setups_[`pin_mode_${pin}`] = `pinMode(${pin}, OUTPUT);`
            return `  analogWrite(${pin}, ${value});\n`
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
            const arg = this.valueToCode(block, 'BOOL', Order.UNARY) || 'false'
            return [`!${arg}`, Order.UNARY]
        }

        // Logic: Controls If / Else
        this.forBlock['controls_if'] = (block) => {
            let n = 0
            let code = ''
            do {
                const condition = this.valueToCode(block, 'IF' + n, Order.NONE) || 'false'
                const branch = this.statementToCode(block, 'DO' + n)
                code += (n > 0 ? ' else if (' : '  if (') + condition + ') {\n' + branch + '  }'
                n++
            } while (block.getInput('IF' + n))

            if (block.getInput('ELSE')) {
                const branch = this.statementToCode(block, 'ELSE')
                code += ' else {\n' + branch + '  }'
            }
            return code + '\n'
        }

        // Math: Number
        this.forBlock['math_number'] = (block) => {
            const num = Number(block.getFieldValue('NUM'))
            return [String(isNaN(num) ? 0 : num), Order.ATOMIC]
        }

        // Math: Arithmetic
        this.forBlock['math_arithmetic'] = (block) => {
            const op = block.getFieldValue('OP')
            const ops: Record<string, [string, number]> = {
                ADD: ['+', Order.ADDITIVE],
                MINUS: ['-', Order.ADDITIVE],
                MULTIPLY: ['*', Order.MULTIPLICATIVE],
                DIVIDE: ['/', Order.MULTIPLICATIVE]
            }
            if (op === 'POWER') {
                const a = this.valueToCode(block, 'A', Order.NONE) || '0'
                const b = this.valueToCode(block, 'B', Order.NONE) || '0'
                return [`pow(${a}, ${b})`, Order.UNARY]
            }
            const tuple = ops[op] || ['+', Order.ADDITIVE]
            const a = this.valueToCode(block, 'A', tuple[1]) || '0'
            const b = this.valueToCode(block, 'B', tuple[1]) || '0'
            return [`${a} ${tuple[0]} ${b}`, tuple[1]]
        }

        // Loops: Repeat Ext
        this.forBlock['controls_repeat_ext'] = (block) => {
            const repeats = this.valueToCode(block, 'TIMES', Order.NONE) || '0'
            const branch = this.statementToCode(block, 'DO')
            return `  for (int i = 0; i < ${repeats}; i++) {\n${branch}  }\n`
        }

        // Loops: While / Until
        this.forBlock['controls_whileUntil'] = (block) => {
            const until = block.getFieldValue('MODE') === 'UNTIL'
            let argument0 = this.valueToCode(block, 'BOOL', until ? Order.UNARY : Order.NONE) || 'false'
            if (until) {
                argument0 = '!' + argument0
            }
            const branch = this.statementToCode(block, 'DO')
            return `  while (${argument0}) {\n${branch}  }\n`
        }

        // Text: Raw string
        this.forBlock['text'] = (block) => {
            const text = block.getFieldValue('TEXT') || ''
            return [JSON.stringify(text), Order.ATOMIC]
        }

        // Text: Print
        this.forBlock['text_print'] = (block) => {
            const content = this.valueToCode(block, 'TEXT', Order.NONE) || '""'
            this.setups_['serial_begin'] = 'Serial.begin(115200);'
            return `  Serial.println(${content});\n`
        }

        // Variables: Get
        this.forBlock['variables_get'] = (block) => {
            const varName = block.getField('VAR')?.getText() || 'val'
            return [varName, Order.ATOMIC]
        }

        // Variables: Set
        this.forBlock['variables_set'] = (block) => {
            const varName = block.getField('VAR')?.getText() || 'val'
            const value = this.valueToCode(block, 'VALUE', Order.ASSIGNMENT) || '0'
            this.definitions_[`var_${varName}`] = `int ${varName} = 0;`
            return `  ${varName} = ${value};\n`
        }
    }
}

export const arduinoGenerator = new ArduinoGenerator()
