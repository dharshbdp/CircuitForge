import { ipcMain, BrowserWindow } from 'electron'
import { listSerialDevices } from '../device/deviceManager'
import {
  connectSerialPort,
  disconnectSerialPort,
  writeSerialData,
  getCurrentConnectionState
} from '../serial/serialManager'

/**
 * Register all IPC command and query channels for the main process.
 */
export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null): void {
  // Ping sanity test
  ipcMain.on('ping', () => console.log('pong'))

  // Enumerate COM ports
  ipcMain.handle('serial:list-ports', async () => {
    return listSerialDevices()
  })

  // Connect to serial device
  ipcMain.handle(
    'serial:connect',
    async (_, { path, baudRate }: { path: string; baudRate: number }) => {
      return connectSerialPort(
        path,
        baudRate,
        (data: string) => {
          const win = getMainWindow()
          win?.webContents.send('serial:data', data)
        },
        (state) => {
          const win = getMainWindow()
          win?.webContents.send('serial:state-change', state)
        }
      )
    }
  )

  // Disconnect active port
  ipcMain.handle('serial:disconnect', async () => {
    return disconnectSerialPort()
  })

  // Transmit data over serial
  ipcMain.handle('serial:write', async (_, data: string) => {
    return writeSerialData(data)
  })

  // Query current hardware connection state
  ipcMain.handle('serial:get-state', () => {
    return getCurrentConnectionState()
  })
}
