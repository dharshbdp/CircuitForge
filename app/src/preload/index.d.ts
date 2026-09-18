import { ElectronAPI } from '@electron-toolkit/preload'
import type { CircuitForgeAPI } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: CircuitForgeAPI
  }
}
