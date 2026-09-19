import { SerialPort } from 'serialport'
import type { ConnectionState } from '@shared/types'

let activePort: SerialPort | null = null
let currentState: ConnectionState = {
  status: 'disconnected',
  path: null,
  baudRate: null
}

let savedOnData: ((data: string) => void) | null = null
let savedOnStateChange: ((state: ConnectionState) => void) | null = null
let pausedConnection: { path: string; baudRate: number } | null = null
let isPausedForFlashing = false

export function getCurrentConnectionState(): ConnectionState {
  return currentState
}

/**
 * Connect to a chosen serial port with specified baud rate.
 */
export function connectSerialPort(
  path: string,
  baudRate: number,
  onData: (data: string) => void,
  onStateChange: (state: ConnectionState) => void
): Promise<boolean> {
  savedOnData = onData
  savedOnStateChange = onStateChange

  return new Promise((resolve) => {
    // If a port is already open, close it first
    if (activePort && activePort.isOpen) {
      try {
        activePort.close()
      } catch (err) {
        console.warn('Error closing existing port:', err)
      }
    }

    currentState = {
      status: 'connecting',
      path,
      baudRate
    }
    onStateChange(currentState)

    try {
      activePort = new SerialPort({
        path,
        baudRate,
        autoOpen: false
      })

      activePort.open((err) => {
        if (err) {
          console.error(`Failed to open serial port ${path}:`, err.message)
          currentState = {
            status: 'error',
            path,
            baudRate,
            error: err.message
          }
          onStateChange(currentState)
          activePort = null
          resolve(false)
          return
        }

        currentState = {
          status: 'connected',
          path,
          baudRate
        }
        onStateChange(currentState)
        resolve(true)
      })

      activePort.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8')
        onData(text)
      })

      activePort.on('error', (err: Error) => {
        if (isPausedForFlashing) return
        console.error('Serial port error:', err.message)
        currentState = {
          status: 'error',
          path,
          baudRate,
          error: err.message
        }
        onStateChange(currentState)
      })

      activePort.on('close', () => {
        if (isPausedForFlashing) return
        currentState = {
          status: 'disconnected',
          path: null,
          baudRate: null
        }
        onStateChange(currentState)
        activePort = null
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('Exception opening port:', message)
      currentState = {
        status: 'error',
        path,
        baudRate,
        error: message
      }
      onStateChange(currentState)
      activePort = null
      resolve(false)
    }
  })
}

/**
 * Disconnect current active serial port.
 */
export function disconnectSerialPort(): Promise<boolean> {
  return new Promise((resolve) => {
    if (activePort && activePort.isOpen) {
      activePort.close((err) => {
        if (err) {
          console.error('Error closing port:', err.message)
        }
        activePort = null
        currentState = {
          status: 'disconnected',
          path: null,
          baudRate: null
        }
        resolve(true)
      })
    } else {
      activePort = null
      currentState = {
        status: 'disconnected',
        path: null,
        baudRate: null
      }
      resolve(true)
    }
  })
}

/**
 * Temporarily pause and release the serial port lock for microcontroller flashing.
 */
export async function pauseForFlashing(targetPortPath: string): Promise<boolean> {
  if (
    activePort &&
    activePort.isOpen &&
    currentState.path === targetPortPath &&
    currentState.baudRate
  ) {
    pausedConnection = {
      path: currentState.path,
      baudRate: currentState.baudRate
    }
    isPausedForFlashing = true

    return new Promise((resolve) => {
      activePort?.close((err) => {
        if (err) {
          console.warn('Error pausing serial port:', err)
        }
        activePort = null
        resolve(true)
      })
    })
  }
  return true
}

/**
 * Re-open and resume serial telemetry after microcontroller flashing terminates.
 */
export async function resumeAfterFlashing(): Promise<void> {
  if (isPausedForFlashing && pausedConnection && savedOnData && savedOnStateChange) {
    const toRestore = { ...pausedConnection }
    const onData = savedOnData
    const onStateChange = savedOnStateChange

    isPausedForFlashing = false
    pausedConnection = null

    // Wait 500ms for microcontroller to complete USB-CDC re-enumeration post-flash
    await new Promise((r) => setTimeout(r, 500))
    await connectSerialPort(toRestore.path, toRestore.baudRate, onData, onStateChange)
  } else {
    isPausedForFlashing = false
    pausedConnection = null
  }
}

/**
 * Send raw string data to active serial device.
 */
export function writeSerialData(data: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!activePort || !activePort.isOpen) {
      reject(new Error('Serial port is not connected'))
      return
    }

    activePort.write(data, (err) => {
      if (err) {
        console.error('Error writing to serial port:', err.message)
        reject(err)
      } else {
        resolve(true)
      }
    })
  })
}
