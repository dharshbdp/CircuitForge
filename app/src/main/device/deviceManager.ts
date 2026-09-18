import { SerialPort } from 'serialport'
import type { SerialPortDescriptor } from '@shared/types'

/**
 * Enumerate all available serial/COM ports on the system with device identification.
 */
export async function listSerialDevices(): Promise<SerialPortDescriptor[]> {
  try {
    const rawPorts = await SerialPort.list()

    return rawPorts.map((port) => {
      let friendly = (port as { friendlyName?: string }).friendlyName || port.path

      // Augment known microcontrollers if manufacturer/PID/VID matches
      if (port.vendorId === '2341' || port.manufacturer?.toLowerCase().includes('arduino')) {
        friendly = `${friendly} [Arduino]`
      } else if (port.vendorId === '10c4' || port.vendorId === '1a86') {
        friendly = `${friendly} [USB-UART / ESP32]`
      }

      return {
        path: port.path,
        friendlyName: friendly,
        manufacturer: port.manufacturer,
        serialNumber: port.serialNumber,
        vendorId: port.vendorId,
        productId: port.productId
      }
    })
  } catch (error) {
    console.error('Error listing serial devices:', error)
    return []
  }
}
