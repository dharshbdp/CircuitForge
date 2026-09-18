import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  listSerialPorts,
  connectSerialPort,
  disconnectSerialPort,
  writeSerialData,
  getCurrentConnectionState
} from './serial'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 850,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'CircuitForge',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer based on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.circuitforge.app')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Serial Port IPC
  ipcMain.handle('serial:list-ports', async () => {
    return listSerialPorts()
  })

  ipcMain.handle(
    'serial:connect',
    async (_, { path, baudRate }: { path: string; baudRate: number }) => {
      return connectSerialPort(
        path,
        baudRate,
        (data: string) => {
          mainWindow?.webContents.send('serial:data', data)
        },
        (state) => {
          mainWindow?.webContents.send('serial:state-change', state)
        }
      )
    }
  )

  ipcMain.handle('serial:disconnect', async () => {
    return disconnectSerialPort()
  })

  ipcMain.handle('serial:write', async (_, data: string) => {
    return writeSerialData(data)
  })

  ipcMain.handle('serial:get-state', () => {
    return getCurrentConnectionState()
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    disconnectSerialPort()
    app.quit()
  }
})
