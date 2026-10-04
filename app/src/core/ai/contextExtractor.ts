import type * as Blockly from 'blockly'
import { getBoardById } from '@hardware'

export interface ExtractedHardwareComponent {
  type: string
  name: string
  pins: Record<string, string>
  details?: Record<string, unknown>
}

export interface WorkspaceHardwareContext {
  boardId: string
  boardName: string
  operatingVoltage: string
  components: ExtractedHardwareComponent[]
  usedPins: string[]
  code: string
}

/**
 * Extracts connected hardware components, active pin mappings, and board capabilities
 * from a Blockly workspace into a structured hardware context.
 */
export function extractHardwareContext(
  workspace: Blockly.WorkspaceSvg,
  boardId: string,
  code: string
): WorkspaceHardwareContext {
  const board = getBoardById(boardId)
  const allBlocks = workspace.getAllBlocks(false)
  const components: ExtractedHardwareComponent[] = []
  const usedPinsSet = new Set<string>()

  for (const block of allBlocks) {
    const type = block.type

    switch (type) {
      // 1. Ultrasonic Sensor (HC-SR04)
      case 'sensor_ultrasonic': {
        const trig = block.getFieldValue('TRIG') || '12'
        const echo = block.getFieldValue('ECHO') || '11'
        usedPinsSet.add(trig)
        usedPinsSet.add(echo)
        components.push({
          type: 'ultrasonic',
          name: 'HC-SR04 Ultrasonic Distance Sensor',
          pins: { Trig: trig, Echo: echo },
          details: { unit: block.getFieldValue('UNIT') || 'CM' }
        })
        break
      }

      // 2. Servo Motor
      case 'actuator_servo': {
        const pin = block.getFieldValue('PIN') || '9'
        usedPinsSet.add(pin)
        components.push({
          type: 'servo',
          name: `Standard Servo Motor (Pin ${pin})`,
          pins: { Signal: pin }
        })
        break
      }

      // 3. DHT11 / DHT22 Sensor
      case 'sensor_dht': {
        const pin = block.getFieldValue('PIN') || '2'
        const model = block.getFieldValue('MODEL') || 'DHT11'
        usedPinsSet.add(pin)
        components.push({
          type: 'dht',
          name: `${model} Temperature & Humidity Sensor`,
          pins: { Data: pin },
          details: { model }
        })
        break
      }

      // 4. Relay Module
      case 'actuator_relay': {
        const pin = block.getFieldValue('PIN') || '7'
        usedPinsSet.add(pin)
        components.push({
          type: 'relay',
          name: `Relay Switch Module (Pin ${pin})`,
          pins: { IN: pin }
        })
        break
      }

      // 5. NeoPixel WS2812B RGB LED Strip
      case 'neopixel_init': {
        const pin = block.getFieldValue('PIN') || '6'
        usedPinsSet.add(pin)
        components.push({
          type: 'neopixel',
          name: `WS2812B NeoPixel Addressable LED Strip (Pin ${pin})`,
          pins: { DIN: pin }
        })
        break
      }

      // 6. LDR Light Sensor
      case 'sensor_light_ldr': {
        const pin = block.getFieldValue('PIN') || 'A0'
        usedPinsSet.add(pin)
        components.push({
          type: 'ldr',
          name: `LDR Photoresistor / Light Sensor (Pin ${pin})`,
          pins: { AnalogOutput: pin }
        })
        break
      }

      // 7. PIR Motion Sensor
      case 'sensor_pir': {
        const pin = block.getFieldValue('PIN') || '2'
        usedPinsSet.add(pin)
        components.push({
          type: 'pir',
          name: `PIR Motion Sensor (Pin ${pin})`,
          pins: { Output: pin }
        })
        break
      }

      // 8. MQ-2 Gas / Smoke Sensor
      case 'sensor_mq2_read':
      case 'sensor_mq2_digital': {
        const pin = block.getFieldValue('PIN') || 'A0'
        usedPinsSet.add(pin)
        components.push({
          type: 'mq2',
          name: `MQ-2 Gas / Smoke Sensor (Pin ${pin})`,
          pins: { Out: pin }
        })
        break
      }

      // 9. Standard Digital Output (LED / Buzzer)
      case 'pin_digital_write': {
        const pin = block.getFieldValue('PIN')
        if (pin) {
          usedPinsSet.add(pin)
          components.push({
            type: 'digital_out',
            name: `Digital Output Device (LED / Buzzer on Pin ${pin})`,
            pins: { Signal: pin }
          })
        }
        break
      }

      // 10. Standard PWM Output
      case 'pin_analog_write': {
        const pin = block.getFieldValue('PIN')
        if (pin) {
          usedPinsSet.add(pin)
          components.push({
            type: 'pwm_out',
            name: `PWM Modulated Output (Dimmer / Motor on Pin ${pin})`,
            pins: { PWM: pin }
          })
        }
        break
      }

      // 11. Standard Digital Input (Pushbutton)
      case 'pin_digital_read': {
        const pin = block.getFieldValue('PIN')
        if (pin) {
          usedPinsSet.add(pin)
          components.push({
            type: 'digital_in',
            name: `Digital Input Sensor (Button / Switch on Pin ${pin})`,
            pins: { Signal: pin }
          })
        }
        break
      }

      // 12. Standard Analog Input (Potentiometer)
      case 'pin_analog_read': {
        const pin = block.getFieldValue('PIN')
        if (pin) {
          usedPinsSet.add(pin)
          components.push({
            type: 'analog_in',
            name: `Analog Sensor (Potentiometer on Pin ${pin})`,
            pins: { Signal: pin }
          })
        }
        break
      }

      default:
        break
    }
  }

  // Deduplicate components with same type and pins
  const uniqueComponents: ExtractedHardwareComponent[] = []
  const seenKeys = new Set<string>()

  for (const c of components) {
    const key = `${c.type}:${JSON.stringify(c.pins)}`
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      uniqueComponents.push(c)
    }
  }

  return {
    boardId: board?.id || boardId,
    boardName: board?.name || 'Microcontroller Board',
    operatingVoltage: board ? `${board.voltage}V` : '5V',
    components: uniqueComponents,
    usedPins: Array.from(usedPinsSet),
    code
  }
}
