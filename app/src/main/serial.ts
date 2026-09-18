import { SerialPort } from 'serialport'

import type { ConnectionState, ConnectionStatus, SerialPortDescriptor } from '../shared/types'

export type { ConnectionState, ConnectionStatus, SerialPortDescriptor }

let activePort: SerialPort | null = null
let currentState: ConnectionState = {
  status: 'disconnected',
  path: null,
  baudRate: null
}

/**
 * Enumerate all available serial/COM ports on the system.
 */
export async function listSerialPorts(): Promise<SerialPortDescriptor[]> {
  try {
    const rawPorts = await SerialPort.list()

    return rawPorts.map((port) => ({
      path: port.path,
      friendlyName: (port as { friendlyName?: string }).friendlyName || port.path,
      manufacturer: port.manufacturer,
      serialNumber: port.serialNumber,
      vendorId: port.vendorId,
      productId: port.productId
    }))
  } catch (error) {
    console.error('Error listing serial ports:', error)
    return []
  }
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

export function getCurrentConnectionState(): ConnectionState {
  return currentState
}
