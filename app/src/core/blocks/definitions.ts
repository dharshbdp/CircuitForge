import * as Blockly from 'blockly'
import { ARDUINO_UNO_DIGITAL_PINS, ARDUINO_UNO_ANALOG_PINS } from '@hardware'

const DIGITAL_PINS = ARDUINO_UNO_DIGITAL_PINS
const ANALOG_PINS = ARDUINO_UNO_ANALOG_PINS

// Register custom hardware blocks using Blockly JSON schema
export function registerHardwareBlocks(): void {
  // Prevent duplicate registration on hot-reload
  if (Blockly.Blocks['pin_digital_write']) return

  Blockly.common.defineBlocksWithJsonArray([
    // 1. Digital Write
    {
      type: 'pin_digital_write',
      message0: 'digital write pin %1 to %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'PIN',
          options: DIGITAL_PINS
        },
        {
          type: 'field_dropdown',
          name: 'STATE',
          options: [
            ['HIGH', 'HIGH'],
            ['LOW', 'LOW']
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'gpio_blocks',
      tooltip: 'Set a digital pin to HIGH (3.3V/5V) or LOW (0V).'
    },

    // 2. Digital Read
    {
      type: 'pin_digital_read',
      message0: 'digital read pin %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'PIN',
          options: DIGITAL_PINS
        }
      ],
      output: 'Boolean',
      style: 'gpio_blocks',
      tooltip: 'Read digital state (HIGH/LOW) from a pin.'
    },

    // 3. Analog Write (PWM)
    {
      type: 'pin_analog_write',
      message0: 'analog write pin %1 value %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'PIN',
          options: DIGITAL_PINS
        },
        {
          type: 'input_value',
          name: 'VALUE',
          check: 'Number'
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'gpio_blocks',
      tooltip: 'Outputs a PWM signal (0 to 255) to simulate analog voltage.'
    },

    // 4. Analog Read
    {
      type: 'pin_analog_read',
      message0: 'analog read pin %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'PIN',
          options: ANALOG_PINS
        }
      ],
      output: 'Number',
      style: 'gpio_blocks',
      tooltip: 'Read analog voltage level (0 to 1023 on 10-bit ADC).'
    },

    // 5. Pin Mode
    {
      type: 'pin_set_mode',
      message0: 'set pin %1 mode to %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'PIN',
          options: DIGITAL_PINS
        },
        {
          type: 'field_dropdown',
          name: 'MODE',
          options: [
            ['OUTPUT', 'OUTPUT'],
            ['INPUT', 'INPUT'],
            ['INPUT_PULLUP', 'INPUT_PULLUP']
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'gpio_blocks',
      tooltip: 'Configures whether a pin behaves as an Input or Output.'
    },

    // 6. Delay Milliseconds
    {
      type: 'time_delay',
      message0: 'wait %1 ms',
      args0: [
        {
          type: 'input_value',
          name: 'DELAY_MS',
          check: 'Number'
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'timing_blocks',
      tooltip: 'Pauses execution for the specified milliseconds.'
    },

    // 7. Delay Microseconds
    {
      type: 'time_delay_micros',
      message0: 'wait %1 microseconds',
      args0: [
        {
          type: 'input_value',
          name: 'DELAY_US',
          check: 'Number'
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'timing_blocks',
      tooltip: 'Pauses execution for microseconds (for time-critical sensors).'
    },

    // 8. System Runtime Millis
    {
      type: 'time_millis',
      message0: 'current runtime (millis)',
      output: 'Number',
      style: 'timing_blocks',
      tooltip: 'Returns elapsed milliseconds since the board started running.'
    },

    // 9. Ultrasonic Distance Sensor (HC-SR04)
    {
      type: 'sensor_ultrasonic',
      message0: 'read distance (cm) Trig: %1 Echo: %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'TRIG_PIN',
          options: DIGITAL_PINS
        },
        {
          type: 'field_dropdown',
          name: 'ECHO_PIN',
          options: DIGITAL_PINS
        }
      ],
      output: 'Number',
      style: 'sensor_blocks',
      tooltip: 'Measures distance in centimeters using HC-SR04 ultrasound.'
    },

    // 10. Servo Motor Angle
    {
      type: 'actuator_servo',
      message0: 'rotate servo pin %1 to %2 degrees',
      args0: [
        {
          type: 'field_dropdown',
          name: 'PIN',
          options: DIGITAL_PINS
        },
        {
          type: 'input_value',
          name: 'ANGLE',
          check: 'Number'
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'actuator_blocks',
      tooltip: 'Positions standard servo motor shaft from 0 to 180 degrees.'
    },

    // 11. Relay Switch
    {
      type: 'actuator_relay',
      message0: 'set relay pin %1 to %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'PIN',
          options: DIGITAL_PINS
        },
        {
          type: 'field_dropdown',
          name: 'STATE',
          options: [
            ['ON', 'HIGH'],
            ['OFF', 'LOW']
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'actuator_blocks',
      tooltip: 'Turn relay switch ON or OFF.'
    },

    // 12. Serial Print
    {
      type: 'serial_print',
      message0: 'serial print %1 newline %2',
      args0: [
        {
          type: 'input_value',
          name: 'CONTENT'
        },
        {
          type: 'field_checkbox',
          name: 'NEWLINE',
          checked: true
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'serial_blocks',
      tooltip: 'Sends data over USB serial stream to the Serial Monitor.'
    },

    // 13. DHT11 / DHT22 Temperature & Humidity
    {
      type: 'sensor_dht',
      message0: 'read DHT %1 pin %2 metric: %3',
      args0: [
        {
          type: 'field_dropdown',
          name: 'MODEL',
          options: [
            ['DHT11', 'DHT11'],
            ['DHT22', 'DHT22']
          ]
        },
        {
          type: 'field_dropdown',
          name: 'PIN',
          options: DIGITAL_PINS
        },
        {
          type: 'field_dropdown',
          name: 'METRIC',
          options: [
            ['Temperature (°C)', 'TEMP_C'],
            ['Temperature (°F)', 'TEMP_F'],
            ['Humidity (%)', 'HUMIDITY']
          ]
        }
      ],
      output: 'Number',
      style: 'sensor_blocks',
      tooltip: 'Reads temperature or relative humidity from a DHT11 or DHT22 sensor.'
    },

    // 14. LDR Ambient Light Sensor
    {
      type: 'sensor_light_ldr',
      message0: 'read light level pin %1 as %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'PIN',
          options: ANALOG_PINS
        },
        {
          type: 'field_dropdown',
          name: 'MODE',
          options: [
            ['Raw ADC (0-1023)', 'RAW'],
            ['Percentage (0-100%)', 'PERCENT']
          ]
        }
      ],
      output: 'Number',
      style: 'sensor_blocks',
      tooltip: 'Measures ambient light intensity using an analog LDR photoresistor.'
    },

    // 15. PIR Motion Sensor
    {
      type: 'sensor_pir',
      message0: 'motion detected on pin %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'PIN',
          options: DIGITAL_PINS
        }
      ],
      output: 'Boolean',
      style: 'sensor_blocks',
      tooltip: 'Detects infrared human/object motion via a digital PIR sensor.'
    },

    // 16. NeoPixel Strip Init
    {
      type: 'neopixel_init',
      message0: 'initialize NeoPixel pin %1 with %2 LEDs',
      args0: [
        {
          type: 'field_dropdown',
          name: 'PIN',
          options: DIGITAL_PINS
        },
        {
          type: 'input_value',
          name: 'COUNT',
          check: 'Number'
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'actuator_blocks',
      tooltip: 'Initializes an addressable WS2812B NeoPixel strip or ring on the given pin.'
    },

    // 17. NeoPixel Set Pixel Color
    {
      type: 'neopixel_set_color',
      message0: 'set NeoPixel pin %1 LED # %2 to R: %3 G: %4 B: %5',
      args0: [
        {
          type: 'field_dropdown',
          name: 'PIN',
          options: DIGITAL_PINS
        },
        {
          type: 'input_value',
          name: 'PIXEL',
          check: 'Number'
        },
        {
          type: 'input_value',
          name: 'RED',
          check: 'Number'
        },
        {
          type: 'input_value',
          name: 'GREEN',
          check: 'Number'
        },
        {
          type: 'input_value',
          name: 'BLUE',
          check: 'Number'
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'actuator_blocks',
      tooltip: 'Sets RGB color for a specific pixel on the NeoPixel strip.'
    },

    // 18. NeoPixel Clear
    {
      type: 'neopixel_clear',
      message0: 'clear NeoPixel pin %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'PIN',
          options: DIGITAL_PINS
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'actuator_blocks',
      tooltip: 'Turns off all LEDs on the NeoPixel strip.'
    }
  ])
}

// Auto-register on module load
registerHardwareBlocks()
