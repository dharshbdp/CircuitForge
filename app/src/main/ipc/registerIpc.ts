import { ipcMain, BrowserWindow, dialog } from 'electron'
import * as fs from 'fs/promises'
import { listSerialDevices } from '../device/deviceManager'
import {
  connectSerialPort,
  disconnectSerialPort,
  writeSerialData,
  getCurrentConnectionState
} from '../serial/serialManager'
import { getToolchainStatus, installCore, compile, upload } from '../compiler'
import type { CircuitForgeProject, SaveProjectResult, OpenProjectResult } from '../../shared/types'

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

  // Project Storage: Save project (.circuitforge JSON)
  ipcMain.handle(
    'project:save',
    async (
      _,
      { project, filePath }: { project: CircuitForgeProject; filePath?: string }
    ): Promise<SaveProjectResult> => {
      try {
        let targetPath = filePath
        if (!targetPath) {
          const win = getMainWindow()
          const sanitizedName = (project.name || 'project').replace(/[/\\?%*:|"<>]/g, '_')
          const saveDialogResult = await (win
            ? dialog.showSaveDialog(win, {
                title: 'Save CircuitForge Project',
                defaultPath: `${sanitizedName}.circuitforge`,
                filters: [
                  { name: 'CircuitForge Project (*.circuitforge)', extensions: ['circuitforge'] }
                ]
              })
            : dialog.showSaveDialog({
                title: 'Save CircuitForge Project',
                defaultPath: `${sanitizedName}.circuitforge`,
                filters: [
                  { name: 'CircuitForge Project (*.circuitforge)', extensions: ['circuitforge'] }
                ]
              }))

          if (saveDialogResult.canceled || !saveDialogResult.filePath) {
            return { success: false, canceled: true }
          }
          targetPath = saveDialogResult.filePath
        }

        const serialized = JSON.stringify(project, null, 2)
        await fs.writeFile(targetPath, serialized, 'utf-8')
        return { success: true, filePath: targetPath }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        return { success: false, error: message }
      }
    }
  )

  // Project Storage: Open project (.circuitforge JSON)
  ipcMain.handle('project:open', async (): Promise<OpenProjectResult> => {
    try {
      const win = getMainWindow()
      const openDialogResult = await (win
        ? dialog.showOpenDialog(win, {
            title: 'Open CircuitForge Project',
            filters: [
              { name: 'CircuitForge Project (*.circuitforge)', extensions: ['circuitforge'] }
            ],
            properties: ['openFile']
          })
        : dialog.showOpenDialog({
            title: 'Open CircuitForge Project',
            filters: [
              { name: 'CircuitForge Project (*.circuitforge)', extensions: ['circuitforge'] }
            ],
            properties: ['openFile']
          }))

      if (
        openDialogResult.canceled ||
        !openDialogResult.filePaths ||
        openDialogResult.filePaths.length === 0
      ) {
        return { success: false, canceled: true }
      }

      const selectedPath = openDialogResult.filePaths[0]
      const raw = await fs.readFile(selectedPath, 'utf-8')
      const parsed = JSON.parse(raw) as CircuitForgeProject

      if (!parsed || parsed.formatVersion !== '1.0' || !parsed.workspace) {
        return {
          success: false,
          error: 'Invalid or unsupported CircuitForge project file format.'
        }
      }

      return { success: true, project: parsed, filePath: selectedPath }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })
}
