import { ipcMain, BrowserWindow } from 'electron'
import { listSerialDevices } from '../device/deviceManager'
import {
  connectSerialPort,
  disconnectSerialPort,
  writeSerialData,
  getCurrentConnectionState
} from '../serial/serialManager'
import { getToolchainStatus, installCore, compile, upload } from '../compiler'

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

  // Check compiler toolchain presence and installed cores
  ipcMain.handle('compiler:check-toolchain', async () => {
    return getToolchainStatus()
  })

  // Trigger installation of default core
  ipcMain.handle('compiler:install-toolchain', async () => {
    const win = getMainWindow()
    return installCore('arduino:avr', (log: string) => {
      win?.webContents.send('compiler:log', log)
    })
  })

  // Compile sketch
  ipcMain.handle('compiler:compile', async (_, { code, fqbn }: { code: string; fqbn: string }) => {
    const win = getMainWindow()
    return compile(code, fqbn, (log: string) => {
      win?.webContents.send('compiler:log', log)
    })
  })

  // Upload sketch to microcontroller
  ipcMain.handle(
    'compiler:upload',
    async (_, { code, fqbn, port }: { code: string; fqbn: string; port: string }) => {
      const win = getMainWindow()
      return upload(code, fqbn, port, (log: string) => {
        win?.webContents.send('compiler:log', log)
      })
    }
  )
}
