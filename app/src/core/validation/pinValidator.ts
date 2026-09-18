import { ARDUINO_UNO_PROFILE } from '@hardware'

export interface PinValidationResult {
  isValid: boolean
  warning?: string
}

export function validatePwmPin(pin: string): PinValidationResult {
  const isPwm = (ARDUINO_UNO_PROFILE.pwmPins as readonly string[]).includes(pin)
  if (!isPwm) {
    return {
      isValid: false,
      warning: `Pin D${pin} does not support hardware PWM (analogWrite). Use pins 3, 5, 6, 9, 10, or 11.`
    }
  }
  return { isValid: true }
}

export function validateSerialPin(pin: string, serialActive = true): PinValidationResult {
  if (serialActive && (pin === '0' || pin === '1')) {
    return {
      isValid: true,
      warning: `Pin D${pin} is shared with hardware Serial (USB). Using it may disrupt serial communication.`
    }
  }
  return { isValid: true }
}
