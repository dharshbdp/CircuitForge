import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  CircuitForgeAPI,
  ConnectionState,
  SerialPortDescriptor,
  ToolchainStatus,
  CompileResult,
  UploadResult,
  CircuitForgeProject,
  SaveProjectResult,
  OpenProjectResult,
  ExplainCircuitRequest,
  CircuitExplanation,
  AiApiKeyStatus,
  BlockSynthesisRequest,
  BlockSynthesisResult,
  AiTranspileRequest,
  AiTranspileResult
} from '../shared/types'

// Custom APIs for renderer
const api: CircuitForgeAPI = {
  listSerialPorts: (): Promise<SerialPortDescriptor[]> => ipcRenderer.invoke('serial:list-ports'),

  connectSerial: (path: string, baudRate: number): Promise<boolean> =>
    ipcRenderer.invoke('serial:connect', { path, baudRate }),

  disconnectSerial: (): Promise<boolean> => ipcRenderer.invoke('serial:disconnect'),

  sendSerialData: (data: string): Promise<boolean> => ipcRenderer.invoke('serial:write', data),

  getConnectionState: (): Promise<ConnectionState> => ipcRenderer.invoke('serial:get-state'),

  onSerialData: (callback: (data: string) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, data: string): void => callback(data)
    ipcRenderer.on('serial:data', handler)
    return () => {
      ipcRenderer.removeListener('serial:data', handler)
    }
  },

  onConnectionStateChange: (callback: (state: ConnectionState) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, state: ConnectionState): void => callback(state)
    ipcRenderer.on('serial:state-change', handler)
    return () => {
      ipcRenderer.removeListener('serial:state-change', handler)
    }
  },

  checkToolchain: (): Promise<ToolchainStatus> => ipcRenderer.invoke('compiler:check-toolchain'),

  installToolchain: (): Promise<boolean> => ipcRenderer.invoke('compiler:install-toolchain'),

  compileSketch: (code: string, fqbn: string): Promise<CompileResult> =>
    ipcRenderer.invoke('compiler:compile', { code, fqbn }),

  uploadSketch: (code: string, fqbn: string, port: string): Promise<UploadResult> =>
    ipcRenderer.invoke('compiler:upload', { code, fqbn, port }),

  onToolchainLog: (callback: (log: string) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, log: string): void => callback(log)
    ipcRenderer.on('compiler:log', handler)
    return () => {
      ipcRenderer.removeListener('compiler:log', handler)
    }
  },

  saveProject: (project: CircuitForgeProject, filePath?: string): Promise<SaveProjectResult> =>
    ipcRenderer.invoke('project:save', { project, filePath }),

  openProject: (): Promise<OpenProjectResult> => ipcRenderer.invoke('project:open'),

  // AI Hardware Copilot (Milestone v0.6 Phase 13)
  explainCircuit: (request: ExplainCircuitRequest): Promise<CircuitExplanation> =>
    ipcRenderer.invoke('ai:explain-circuit', request),

  setAiApiKey: (apiKey: string): Promise<boolean> => ipcRenderer.invoke('ai:set-api-key', apiKey),

  getAiApiKeyStatus: (): Promise<AiApiKeyStatus> => ipcRenderer.invoke('ai:get-api-key-status'),

  // AI Natural Language Block Synthesis (Milestone v0.6 Phase 14)
  synthesizeBlocks: (request: BlockSynthesisRequest): Promise<BlockSynthesisResult> =>
    ipcRenderer.invoke('ai:synthesize-blocks', request),

  // AI Code-to-Blocks Transpiler (Milestone v0.7 Phase 16)
  transpileSketch: (request: AiTranspileRequest): Promise<AiTranspileResult> =>
    ipcRenderer.invoke('ai:transpile-sketch', request)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
