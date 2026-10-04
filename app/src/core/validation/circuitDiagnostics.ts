/**
 * CircuitForge Static Hardware & Pin Conflict Diagnostics Engine
 * Milestone v0.6 Phase 15: Analyzes active Blockly blocks against board hardware profiles
 * to catch pin collisions, PWM timer mismatches, voltage domain hazards, and input-only violations.
 */

import type * as Blockly from 'blockly'
import { getBoardById } from '../../hardware'

export type ConflictSeverity = 'error' | 'warning' | 'info'

export interface CircuitConflict {
  id: string
  blockId: string
  blockType: string
  pin: string
  severity: ConflictSeverity
  title: string
  message: string
  suggestedFix: string
}

export interface CircuitDiagnosticsResult {
  isValid: boolean
  hasErrors: boolean
  hasWarnings: boolean
  errorCount: number
  warningCount: number
  conflicts: CircuitConflict[]
  summary: string
}

interface BlockPinUsage {
  blockId: string
  blockType: string
  pin: string
  role:
    | 'digital_out'
    | 'digital_in'
    | 'pwm_out'
    | 'analog_in'
    | 'trig_out'
    | 'echo_in'
    | 'servo_out'
    | 'neopixel_out'
    | 'relay_out'
  label: string
}

/**
 * Extracts all pin assignments and their functional roles from active Blockly blocks.
 */
function extractBlockPinUsages(workspace: Blockly.WorkspaceSvg): {
  usages: BlockPinUsage[]
  hasSerial: boolean
} {
  const usages: BlockPinUsage[] = []
  let hasSerial = false

  const allBlocks = workspace.getAllBlocks(false)

  for (const block of allBlocks) {
    if (block.isShadow() || !block.isEnabled()) continue

    const type = block.type

    // Track Serial activity
    if (type === 'serial_print') {
      hasSerial = true
    }

    // 1. Digital Write
    if (type === 'pin_digital_write') {
      const pin = block.getFieldValue('PIN')
      if (pin) {
        usages.push({
          blockId: block.id,
          blockType: type,
          pin: String(pin),
          role: 'digital_out',
          label: 'Digital Output'
        })
      }
    }

    // 2. Digital Read
    if (type === 'pin_digital_read') {
      const pin = block.getFieldValue('PIN')
      if (pin) {
        usages.push({
          blockId: block.id,
          blockType: type,
          pin: String(pin),
          role: 'digital_in',
          label: 'Digital Input'
        })
      }
    }

    // 3. Analog Write (PWM)
    if (type === 'pin_analog_write') {
      const pin = block.getFieldValue('PIN')
      if (pin) {
        usages.push({
          blockId: block.id,
          blockType: type,
          pin: String(pin),
          role: 'pwm_out',
          label: 'Hardware PWM Output'
        })
      }
    }

    // 4. Analog Read (ADC)
    if (type === 'pin_analog_read') {
      const pin = block.getFieldValue('PIN')
      if (pin) {
        usages.push({
          blockId: block.id,
          blockType: type,
          pin: String(pin),
          role: 'analog_in',
          label: 'Analog ADC Input'
        })
      }
    }

    // 5. Ultrasonic Distance Sensor
    if (type === 'sensor_ultrasonic') {
      const trig = block.getFieldValue('TRIG_PIN')
      const echo = block.getFieldValue('ECHO_PIN')
      if (trig) {
        usages.push({
          blockId: block.id,
          blockType: type,
          pin: String(trig),
          role: 'trig_out',
          label: 'Ultrasonic Trigger Output'
        })
      }
      if (echo) {
        usages.push({
          blockId: block.id,
          blockType: type,
          pin: String(echo),
          role: 'echo_in',
          label: 'Ultrasonic Echo Input'
        })
      }
    }

    // 6. Micro Servo Motor
    if (type === 'actuator_servo') {
      const pin = block.getFieldValue('PIN')
      if (pin) {
        usages.push({
          blockId: block.id,
          blockType: type,
          pin: String(pin),
          role: 'servo_out',
          label: 'Servo Motor Signal'
        })
      }
    }

    // 7. Relay Module
    if (type === 'actuator_relay') {
      const pin = block.getFieldValue('PIN')
      if (pin) {
        usages.push({
          blockId: block.id,
          blockType: type,
          pin: String(pin),
          role: 'relay_out',
          label: 'Relay Switch Trigger'
        })
      }
    }

    // 8. NeoPixel RGB Strip
    if (type === 'neopixel_init' || type === 'neopixel_set_color' || type === 'neopixel_clear') {
      const pin = block.getFieldValue('PIN')
      if (pin) {
        usages.push({
          blockId: block.id,
          blockType: type,
          pin: String(pin),
          role: 'neopixel_out',
          label: 'NeoPixel WS2812B Data Line'
        })
      }
    }

    // 9. DHT11 / DHT22 Sensor
    if (type === 'sensor_dht') {
      const pin = block.getFieldValue('PIN')
      if (pin) {
        usages.push({
          blockId: block.id,
          blockType: type,
          pin: String(pin),
          role: 'digital_in',
          label: 'DHT Temperature/Humidity Data'
        })
      }
    }

    // 10. LDR Ambient Light
    if (type === 'sensor_light_ldr') {
      const pin = block.getFieldValue('PIN')
      if (pin) {
        usages.push({
          blockId: block.id,
          blockType: type,
          pin: String(pin),
          role: 'analog_in',
          label: 'LDR Analog Light Input'
        })
      }
    }

    // 11. PIR Motion Sensor
    if (type === 'sensor_pir') {
      const pin = block.getFieldValue('PIN')
      if (pin) {
        usages.push({
          blockId: block.id,
          blockType: type,
          pin: String(pin),
          role: 'digital_in',
          label: 'PIR Motion Input'
        })
      }
    }

    // 12. MQ-2 Gas & Smoke Sensor
    if (type === 'sensor_mq2_read') {
      const pin = block.getFieldValue('PIN')
      if (pin) {
        usages.push({
          blockId: block.id,
          blockType: type,
          pin: String(pin),
          role: 'analog_in',
          label: 'MQ-2 Gas Analog Input'
        })
      }
    }
    if (type === 'sensor_mq2_digital') {
      const pin = block.getFieldValue('PIN')
      if (pin) {
        usages.push({
          blockId: block.id,
          blockType: type,
          pin: String(pin),
          role: 'digital_in',
          label: 'MQ-2 Gas Digital Alert'
        })
      }
    }
  }

  return { usages, hasSerial }
}

/**
 * Normalizes pin string representations ('D9' -> '9', 'A0' -> 'A0').
 */
function normalizePinValue(pin: string): string {
  const clean = pin.trim().replace(/^['"]|['"]$/g, '')
  const noPwm = clean.replace(/\s*\(~PWM\)/i, '').replace(/\s*\(LED\)/i, '')
  const dMatch = noPwm.match(/^D(\d+)$/i)
  if (dMatch) return dMatch[1]
  const gpMatch = noPwm.match(/^(?:GPIO|GP)\s*(\d+)$/i)
  if (gpMatch) return gpMatch[1]
  return noPwm
}

/**
 * Run comprehensive static hardware diagnostics across all workspace blocks.
 */
export function diagnoseCircuit(
  workspace: Blockly.WorkspaceSvg,
  boardId: string
): CircuitDiagnosticsResult {
  const conflicts: CircuitConflict[] = []
  const board = getBoardById(boardId)
  const boardName = board?.name || 'Microcontroller Board'
  const is3v3 = board ? board.voltage <= 3.3 : false

  const { usages, hasSerial } = extractBlockPinUsages(workspace)

  // 1. Diagnose Hardware Serial Pin Conflicts (Pin 0/1 on AVR Uno)
  if (boardId.includes('uno') || boardId.includes('avr')) {
    for (const u of usages) {
      const norm = normalizePinValue(u.pin)
      if (norm === '0' || norm === '1') {
        const pinName = norm === '0' ? 'D0 (RX)' : 'D1 (TX)'
        if (hasSerial) {
          conflicts.push({
            id: `serial-conflict-${u.blockId}-${norm}`,
            blockId: u.blockId,
            blockType: u.blockType,
            pin: u.pin,
            severity: 'error',
            title: `Serial UART Collision on Pin ${pinName}`,
            message: `Pin ${pinName} is hardwired to the ATmega16U2 USB transceiver. Using it for ${u.label} will corrupt Serial transmission and cause flashing timeouts.`,
            suggestedFix: `Reassign ${u.label} to an available general-purpose pin (D2 to D13).`
          })
        } else {
          conflicts.push({
            id: `serial-warning-${u.blockId}-${norm}`,
            blockId: u.blockId,
            blockType: u.blockType,
            pin: u.pin,
            severity: 'warning',
            title: `Reserved Hardware Serial Pin ${pinName}`,
            message: `Pin ${pinName} is reserved for USB bootloader and serial communication. If you add Serial logging, it will collide.`,
            suggestedFix: `Prefer using general-purpose I/O pins (D2 to D12) instead of D0/D1.`
          })
        }
      }
    }
  }

  // 2. Diagnose PWM Capability on Non-PWM Pins
  for (const u of usages) {
    if (u.role === 'pwm_out') {
      const norm = normalizePinValue(u.pin)

      if (boardId.includes('uno') || boardId.includes('avr')) {
        const pwmPins = ['3', '5', '6', '9', '10', '11']
        if (!pwmPins.includes(norm)) {
          conflicts.push({
            id: `pwm-mismatch-${u.blockId}-${norm}`,
            blockId: u.blockId,
            blockType: u.blockType,
            pin: u.pin,
            severity: 'error',
            title: `Non-PWM Pin D${norm} used for analogWrite()`,
            message: `Pin D${norm} lacks a hardware timer for PWM output on ${boardName}. analogWrite() will behave as a coarse digital ON/OFF switch.`,
            suggestedFix: `Switch PWM to a hardware-supported pin: D3, D5, D6, D9, D10, or D11.`
          })
        }
      }

      // ESP32 input-only pins (34, 35, 36, 39)
      if (boardId.includes('esp32')) {
        const inputOnly = ['34', '35', '36', '39']
        if (inputOnly.includes(norm)) {
          conflicts.push({
            id: `input-only-pwm-${u.blockId}-${norm}`,
            blockId: u.blockId,
            blockType: u.blockType,
            pin: u.pin,
            severity: 'error',
            title: `Input-Only GPIO ${norm} cannot output PWM`,
            message: `GPIO ${norm} is an input-only ADC channel with no output driver circuitry on the ESP32.`,
            suggestedFix: `Reassign PWM output to GPIO 2, 4, 5, 18, 19, 21, 22, or 23.`
          })
        }
      }
    }
  }

  // 3. Diagnose Input-Only Pins used for Any Output on ESP32
  if (boardId.includes('esp32')) {
    const inputOnly = ['34', '35', '36', '39']
    for (const u of usages) {
      const norm = normalizePinValue(u.pin)
      const isOutputRole = [
        'digital_out',
        'pwm_out',
        'trig_out',
        'servo_out',
        'neopixel_out',
        'relay_out'
      ].includes(u.role)

      if (isOutputRole && inputOnly.includes(norm)) {
        conflicts.push({
          id: `input-only-output-${u.blockId}-${norm}`,
          blockId: u.blockId,
          blockType: u.blockType,
          pin: u.pin,
          severity: 'error',
          title: `GPIO ${norm} is Input-Only`,
          message: `Cannot configure GPIO ${norm} for ${u.label}. This pin does not have internal pull-ups or output FETs.`,
          suggestedFix: `Choose an output-capable GPIO such as 2, 4, 12, 13, 14, 15, or 27.`
        })
      }
    }
  }

  // 4. Diagnose Pin Reuse / Collisions Between Different Peripherals
  const pinMap = new Map<string, BlockPinUsage[]>()
  for (const u of usages) {
    const norm = normalizePinValue(u.pin)
    if (!pinMap.has(norm)) {
      pinMap.set(norm, [])
    }
    pinMap.get(norm)!.push(u)
  }

  for (const [pin, list] of pinMap.entries()) {
    // Ultrasonic self-collision (Trig == Echo on same block)
    const ultrasonicBlock = list.find((x) => x.blockType === 'sensor_ultrasonic')
    if (ultrasonicBlock) {
      const trigEchoSame = list.filter(
        (x) =>
          x.blockId === ultrasonicBlock.blockId && (x.role === 'trig_out' || x.role === 'echo_in')
      )
      if (trigEchoSame.length >= 2) {
        conflicts.push({
          id: `ultrasonic-overlap-${ultrasonicBlock.blockId}`,
          blockId: ultrasonicBlock.blockId,
          blockType: ultrasonicBlock.blockType,
          pin,
          severity: 'error',
          title: `Ultrasonic Trig and Echo share Pin ${pin}`,
          message: `The HC-SR04 ultrasonic sensor requires distinct pins for Trigger and Echo. Sharing Pin ${pin} will latch the echo pulse and return 0cm distance.`,
          suggestedFix: `Use two separate pins (e.g. Trig: Pin 9, Echo: Pin 10).`
        })
      }
    }

    // Multiple distinct blocks sharing the same pin
    const uniqueBlocks = Array.from(new Set(list.map((x) => x.blockId)))
    if (uniqueBlocks.length > 1) {
      const roles = Array.from(new Set(list.map((x) => x.label))).join(' and ')
      for (const u of list) {
        conflicts.push({
          id: `pin-reuse-${u.blockId}-${pin}`,
          blockId: u.blockId,
          blockType: u.blockType,
          pin: u.pin,
          severity: 'error',
          title: `Pin Conflict on Pin ${pin}`,
          message: `Pin ${pin} is concurrently assigned to multiple functions: ${roles}. This causes signal contention and hardware malfunction.`,
          suggestedFix: `Assign each peripheral to a dedicated, unshared pin.`
        })
      }
    }
  }

  // 5. Voltage Domain Mismatches (3.3V boards with 5V components)
  if (is3v3) {
    for (const u of usages) {
      // Ultrasonic HC-SR04 Echo output (5V TTL pulse)
      if (u.role === 'echo_in') {
        conflicts.push({
          id: `voltage-echo-${u.blockId}`,
          blockId: u.blockId,
          blockType: u.blockType,
          pin: u.pin,
          severity: 'warning',
          title: `5V Voltage Domain Risk: HC-SR04 Echo on 3.3V Pin ${u.pin}`,
          message: `Standard HC-SR04 Echo pin outputs 5V logic pulses. Connecting directly to 3.3V GPIO on ${boardName} exceeds the maximum rated input voltage (3.6V).`,
          suggestedFix: `Install a 1kΩ / 2kΩ resistor voltage divider between Echo and Pin ${u.pin} (or use an HC-SR04P 3.3V version).`
        })
      }

      // MQ-2 Gas sensor analog output (5V peak)
      if (u.blockType === 'sensor_mq2_read') {
        conflicts.push({
          id: `voltage-mq2-${u.blockId}`,
          blockId: u.blockId,
          blockType: u.blockType,
          pin: u.pin,
          severity: 'warning',
          title: `5V Analog Signal Exceeds 3.3V ADC Range on Pin ${u.pin}`,
          message: `MQ-2 sensor analog output scales up to 5.0V, but ${boardName} ADC inputs saturate at 3.3V. High gas concentrations will saturate the ADC or trigger ESD protection diodes.`,
          suggestedFix: `Add a 10kΩ voltage divider or calibrate within the safe 0-3.3V linear range.`
        })
      }

      // Servo motor signal on 3.3V
      if (u.role === 'servo_out') {
        conflicts.push({
          id: `voltage-servo-${u.blockId}`,
          blockId: u.blockId,
          blockType: u.blockType,
          pin: u.pin,
          severity: 'info',
          title: `Servo Motor Power Supply Notice on ${boardName}`,
          message: `Standard SG90 servos require 5V VCC power (drawing up to 600mA stall current). Do not power the servo from the 3.3V regulator rail.`,
          suggestedFix: `Power servo VCC from external 5V / USB VBUS rail, keeping control signal on Pin ${u.pin} with common ground.`
        })
      }
    }
  }

  // Calculate final statistics
  const errorCount = conflicts.filter((c) => c.severity === 'error').length
  const warningCount = conflicts.filter((c) => c.severity === 'warning').length
  const hasErrors = errorCount > 0
  const hasWarnings = warningCount > 0
  const isValid = !hasErrors

  let summary = 'All pin mappings and electrical parameters are valid.'
  if (hasErrors && hasWarnings) {
    summary = `Detected ${errorCount} pin conflict${errorCount > 1 ? 's' : ''} and ${warningCount} electrical warning${warningCount > 1 ? 's' : ''}.`
  } else if (hasErrors) {
    summary = `Detected ${errorCount} fatal pin conflict${errorCount > 1 ? 's' : ''} that must be resolved before flashing.`
  } else if (hasWarnings) {
    summary = `Detected ${warningCount} hardware advisory warning${warningCount > 1 ? 's' : ''}.`
  }

  return {
    isValid,
    hasErrors,
    hasWarnings,
    errorCount,
    warningCount,
    conflicts,
    summary
  }
}

/**
 * Apply or clear visual warning icons directly on workspace blocks.
 */
export function applyBlocklyWarningBadges(
  workspace: Blockly.WorkspaceSvg,
  diagnostics: CircuitDiagnosticsResult
): void {
  const allBlocks = workspace.getAllBlocks(false)
  const conflictMap = new Map<string, string[]>()

  for (const c of diagnostics.conflicts) {
    if (!conflictMap.has(c.blockId)) {
      conflictMap.set(c.blockId, [])
    }
    const tag =
      c.severity === 'error' ? '[CONFLICT]' : c.severity === 'warning' ? '[WARNING]' : '[NOTE]'
    conflictMap.get(c.blockId)!.push(`${tag} ${c.title}\n${c.message}\nFix: ${c.suggestedFix}`)
  }

  for (const block of allBlocks) {
    const messages = conflictMap.get(block.id)
    if (messages && messages.length > 0) {
      block.setWarningText(messages.join('\n\n'))
    } else {
      block.setWarningText(null)
    }
  }
}
