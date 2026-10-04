/**
 * CircuitForge Block Taxonomy Specification & JSON Schema
 * Defines the schema of available visual blocks for LLM prompt context and structure validation.
 */

export interface BlockFieldDefinition {
  name: string
  type: 'dropdown' | 'number' | 'string' | 'boolean'
  options?: string[]
  default?: unknown
}

export interface BlockInputDefinition {
  name: string
  check?: string
  shadowType?: string
  defaultNum?: number
  defaultText?: string
}

export interface BlockSchemaEntry {
  type: string
  category: 'GPIO' | 'Timing' | 'Sensors' | 'Actuators' | 'Serial' | 'Logic' | 'Math' | 'Loops'
  description: string
  isStatement: boolean
  output?: string
  fields?: BlockFieldDefinition[]
  inputs?: BlockInputDefinition[]
}

export const BLOCK_TAXONOMY: BlockSchemaEntry[] = [
  // GPIO
  {
    type: 'pin_set_mode',
    category: 'GPIO',
    description: 'Configure pin mode (OUTPUT, INPUT, INPUT_PULLUP)',
    isStatement: true,
    fields: [
      {
        name: 'PIN',
        type: 'dropdown',
        options: [
          '0',
          '1',
          '2',
          '3',
          '4',
          '5',
          '6',
          '7',
          '8',
          '9',
          '10',
          '11',
          '12',
          '13',
          'A0',
          'A1',
          'A2',
          'A3',
          'A4',
          'A5'
        ]
      },
      { name: 'MODE', type: 'dropdown', options: ['OUTPUT', 'INPUT', 'INPUT_PULLUP'] }
    ]
  },
  {
    type: 'pin_digital_write',
    category: 'GPIO',
    description: 'Write HIGH (5V/3.3V) or LOW (0V) to digital pin',
    isStatement: true,
    fields: [
      {
        name: 'PIN',
        type: 'dropdown',
        options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']
      },
      { name: 'STATE', type: 'dropdown', options: ['HIGH', 'LOW'] }
    ]
  },
  {
    type: 'pin_digital_read',
    category: 'GPIO',
    description: 'Read boolean state (HIGH/LOW) from digital pin',
    isStatement: false,
    output: 'Boolean',
    fields: [
      {
        name: 'PIN',
        type: 'dropdown',
        options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']
      }
    ]
  },
  {
    type: 'pin_analog_write',
    category: 'GPIO',
    description:
      'Output PWM duty cycle (0 to 255) to simulated analog pin (e.g. Pin 3, 5, 6, 9, 10, 11)',
    isStatement: true,
    fields: [{ name: 'PIN', type: 'dropdown', options: ['3', '5', '6', '9', '10', '11'] }],
    inputs: [{ name: 'VALUE', check: 'Number', shadowType: 'math_number', defaultNum: 128 }]
  },
  {
    type: 'pin_analog_read',
    category: 'GPIO',
    description: 'Read analog voltage (0 to 1023) from analog ADC pin (A0-A5)',
    isStatement: false,
    output: 'Number',
    fields: [{ name: 'PIN', type: 'dropdown', options: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'] }]
  },

  // Timing
  {
    type: 'time_delay',
    category: 'Timing',
    description: 'Pause execution for N milliseconds',
    isStatement: true,
    inputs: [{ name: 'DELAY_MS', check: 'Number', shadowType: 'math_number', defaultNum: 1000 }]
  },
  {
    type: 'time_delay_micros',
    category: 'Timing',
    description: 'Pause execution for N microseconds',
    isStatement: true,
    inputs: [{ name: 'DELAY_US', check: 'Number', shadowType: 'math_number', defaultNum: 10 }]
  },
  {
    type: 'time_millis',
    category: 'Timing',
    description: 'Returns elapsed milliseconds since system boot',
    isStatement: false,
    output: 'Number'
  },

  // Sensors
  {
    type: 'sensor_ultrasonic',
    category: 'Sensors',
    description: 'Measures distance in cm using HC-SR04 ultrasonic echo',
    isStatement: false,
    output: 'Number',
    fields: [
      { name: 'TRIG_PIN', type: 'dropdown' },
      { name: 'ECHO_PIN', type: 'dropdown' }
    ]
  },
  {
    type: 'sensor_dht',
    category: 'Sensors',
    description: 'Reads DHT11/DHT22 temperature or relative humidity',
    isStatement: false,
    output: 'Number',
    fields: [
      { name: 'MODEL', type: 'dropdown', options: ['DHT11', 'DHT22'] },
      { name: 'PIN', type: 'dropdown' },
      { name: 'METRIC', type: 'dropdown', options: ['TEMP_C', 'TEMP_F', 'HUMIDITY'] }
    ]
  },
  {
    type: 'sensor_light_ldr',
    category: 'Sensors',
    description: 'Reads ambient light from LDR photoresistor (RAW 0-1023 or PERCENT 0-100%)',
    isStatement: false,
    output: 'Number',
    fields: [
      { name: 'PIN', type: 'dropdown', options: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'] },
      { name: 'MODE', type: 'dropdown', options: ['RAW', 'PERCENT'] }
    ]
  },
  {
    type: 'sensor_pir',
    category: 'Sensors',
    description: 'Detects infrared motion (returns true when motion detected)',
    isStatement: false,
    output: 'Boolean',
    fields: [{ name: 'PIN', type: 'dropdown' }]
  },
  {
    type: 'sensor_mq2_read',
    category: 'Sensors',
    description: 'Reads combustible gas or smoke concentration (RAW 0-1023 or PERCENT)',
    isStatement: false,
    output: 'Number',
    fields: [
      { name: 'PIN', type: 'dropdown', options: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'] },
      { name: 'MODE', type: 'dropdown', options: ['RAW', 'PERCENT'] }
    ]
  },
  {
    type: 'sensor_mq2_digital',
    category: 'Sensors',
    description: 'Returns true if gas/smoke exceeds onboard potentiometer digital threshold',
    isStatement: false,
    output: 'Boolean',
    fields: [{ name: 'PIN', type: 'dropdown' }]
  },
  {
    type: 'sensor_mq2_warmup',
    category: 'Sensors',
    description: 'Stabilizes MQ-2 heating coil in setup for N seconds',
    isStatement: true,
    inputs: [{ name: 'SECONDS', check: 'Number', shadowType: 'math_number', defaultNum: 20 }]
  },

  // Actuators
  {
    type: 'actuator_servo',
    category: 'Actuators',
    description: 'Positions servo motor shaft to angle between 0 and 180 degrees',
    isStatement: true,
    fields: [{ name: 'PIN', type: 'dropdown' }],
    inputs: [{ name: 'ANGLE', check: 'Number', shadowType: 'math_number', defaultNum: 90 }]
  },
  {
    type: 'actuator_relay',
    category: 'Actuators',
    description: 'Switches relay ON (HIGH) or OFF (LOW)',
    isStatement: true,
    fields: [
      { name: 'PIN', type: 'dropdown' },
      { name: 'STATE', type: 'dropdown', options: ['HIGH', 'LOW'] }
    ]
  },
  {
    type: 'neopixel_init',
    category: 'Actuators',
    description: 'Initializes WS2812B NeoPixel strip on pin with N LEDs',
    isStatement: true,
    fields: [{ name: 'PIN', type: 'dropdown' }],
    inputs: [{ name: 'COUNT', check: 'Number', shadowType: 'math_number', defaultNum: 8 }]
  },
  {
    type: 'neopixel_set_color',
    category: 'Actuators',
    description: 'Sets RGB color (0-255 each) for LED index on NeoPixel strip',
    isStatement: true,
    fields: [{ name: 'PIN', type: 'dropdown' }],
    inputs: [
      { name: 'PIXEL', check: 'Number', shadowType: 'math_number', defaultNum: 0 },
      { name: 'RED', check: 'Number', shadowType: 'math_number', defaultNum: 255 },
      { name: 'GREEN', check: 'Number', shadowType: 'math_number', defaultNum: 0 },
      { name: 'BLUE', check: 'Number', shadowType: 'math_number', defaultNum: 0 }
    ]
  },
  {
    type: 'neopixel_clear',
    category: 'Actuators',
    description: 'Turns off all LEDs on NeoPixel strip',
    isStatement: true,
    fields: [{ name: 'PIN', type: 'dropdown' }]
  },

  // Serial
  {
    type: 'serial_print',
    category: 'Serial',
    description: 'Sends value over serial port to the Serial Monitor',
    isStatement: true,
    fields: [{ name: 'NEWLINE', type: 'boolean', default: true }],
    inputs: [{ name: 'CONTENT', shadowType: 'text', defaultText: 'Hello' }]
  },

  // Logic & Math
  {
    type: 'controls_if',
    category: 'Logic',
    description: 'Conditional if / else branching',
    isStatement: true,
    inputs: [{ name: 'IF0', check: 'Boolean' }, { name: 'DO0' }, { name: 'ELSE' }]
  },
  {
    type: 'logic_compare',
    category: 'Logic',
    description: 'Compares two values (EQ, NEQ, LT, LTE, GT, GTE)',
    isStatement: false,
    output: 'Boolean',
    fields: [{ name: 'OP', type: 'dropdown', options: ['EQ', 'NEQ', 'LT', 'LTE', 'GT', 'GTE'] }],
    inputs: [{ name: 'A' }, { name: 'B' }]
  },
  {
    type: 'logic_operation',
    category: 'Logic',
    description: 'Logical AND / OR combination',
    isStatement: false,
    output: 'Boolean',
    fields: [{ name: 'OP', type: 'dropdown', options: ['AND', 'OR'] }],
    inputs: [{ name: 'A' }, { name: 'B' }]
  },
  {
    type: 'logic_boolean',
    category: 'Logic',
    description: 'Boolean constant TRUE or FALSE',
    isStatement: false,
    output: 'Boolean',
    fields: [{ name: 'BOOL', type: 'dropdown', options: ['TRUE', 'FALSE'] }]
  },
  {
    type: 'math_number',
    category: 'Math',
    description: 'Numeric constant',
    isStatement: false,
    output: 'Number',
    fields: [{ name: 'NUM', type: 'number', default: 0 }]
  },
  {
    type: 'text',
    category: 'Math',
    description: 'Text string literal',
    isStatement: false,
    output: 'String',
    fields: [{ name: 'TEXT', type: 'string', default: '' }]
  },
  {
    type: 'raw_cpp_code',
    category: 'Logic',
    description: 'Raw C++ statement fallback',
    isStatement: true,
    fields: [{ name: 'CODE', type: 'string' }]
  }
]

/**
 * Returns formatted schema guidelines for LLM system prompts.
 */
export function getBlockSchemaPrompt(): string {
  return `
CIRCUITFORGE BLOCK TAXONOMY & GRAMMAR:
You synthesize visual logic programs for embedded microcontrollers. The blocks are structured as Blockly AST nodes.
Supported Block Types:
- GPIO:
  * "pin_digital_write": fields: { PIN: "13", STATE: "HIGH"|"LOW" }
  * "pin_digital_read": fields: { PIN: "2" } (output: Boolean)
  * "pin_analog_write": fields: { PIN: "9" }, inputs: { VALUE: { shadow: { type: "math_number", fields: { NUM: 128 } } } } (PWM 0-255)
  * "pin_analog_read": fields: { PIN: "A0" } (output: Number)
  * "pin_set_mode": fields: { PIN: "13", MODE: "OUTPUT"|"INPUT"|"INPUT_PULLUP" }
- Timing:
  * "time_delay": inputs: { DELAY_MS: { shadow: { type: "math_number", fields: { NUM: 1000 } } } }
  * "time_millis": (output: Number)
- Sensors:
  * "sensor_ultrasonic": fields: { TRIG_PIN: "9", ECHO_PIN: "10" } (output: Number cm)
  * "sensor_dht": fields: { MODEL: "DHT11"|"DHT22", PIN: "2", METRIC: "TEMP_C"|"HUMIDITY" } (output: Number)
  * "sensor_light_ldr": fields: { PIN: "A0", MODE: "RAW"|"PERCENT" } (output: Number)
  * "sensor_pir": fields: { PIN: "4" } (output: Boolean)
  * "sensor_mq2_read": fields: { PIN: "A0", MODE: "RAW"|"PERCENT" } (output: Number)
  * "sensor_mq2_digital": fields: { PIN: "8" } (output: Boolean)
- Actuators:
  * "actuator_servo": fields: { PIN: "9" }, inputs: { ANGLE: { shadow: { type: "math_number", fields: { NUM: 90 } } } }
  * "actuator_relay": fields: { PIN: "7", STATE: "HIGH"|"LOW" }
  * "neopixel_init": fields: { PIN: "6" }, inputs: { COUNT: { shadow: { type: "math_number", fields: { NUM: 8 } } } }
  * "neopixel_set_color": fields: { PIN: "6" }, inputs: { PIXEL: num, RED: num, GREEN: num, BLUE: num }
  * "neopixel_clear": fields: { PIN: "6" }
- Serial:
  * "serial_print": fields: { NEWLINE: true }, inputs: { CONTENT: { shadow: { type: "text", fields: { TEXT: "msg" } } } }
- Logic & Control:
  * "controls_if": extraState: { hasElse?: true }, inputs: { IF0: { block: condition }, DO0: { block: statementStack }, ELSE?: { block: statementStack } }
  * "logic_compare": fields: { OP: "EQ"|"NEQ"|"LT"|"LTE"|"GT"|"GTE" }, inputs: { A: { block }, B: { block } }
  * "logic_operation": fields: { OP: "AND"|"OR" }, inputs: { A: { block }, B: { block } }
  * "math_number": fields: { NUM: 10 }
  * "text": fields: { TEXT: "message" }

Block Sequence Rule:
Consecutive statements inside a stack are linked via:
{
  "type": "first_block",
  "fields": { ... },
  "next": {
    "block": {
      "type": "second_block",
      "fields": { ... },
      "next": { ... }
    }
  }
}
`.trim()
}
