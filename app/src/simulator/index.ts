/**
 * CircuitForge Simulator Module (Reserved for Milestone v0.4+)
 * Provides virtual microcontroller emulation and live sensor simulation.
 */

export interface VirtualPinState {
  pin: string
  mode: 'INPUT' | 'OUTPUT' | 'PWM'
  value: number
}

export interface SimulationEngine {
  start(): void
  stop(): void
  pause(): void
  readPin(pin: string): number
  writePin(pin: string, value: number): void
}
