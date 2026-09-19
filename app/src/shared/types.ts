export interface SerialPortDescriptor {
  path: string
  friendlyName?: string
  manufacturer?: string
  serialNumber?: string
  vendorId?: string
  productId?: string
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface ConnectionState {
  status: ConnectionStatus
  path: string | null
  baudRate: number | null
  error?: string
}

export interface ToolchainStatus {
  isInstalled: boolean
  version?: string
  executablePath?: string
  installedCores: string[]
  isDownloading?: boolean
  downloadProgress?: number
}

export interface CompileResult {
  success: boolean
  stdout: string
  stderr: string
  binarySize?: number
  maxBinarySize?: number
  ramUsage?: number
  maxRam?: number
  humanError?: string
  buildDir?: string
}

export interface UploadResult {
  success: boolean
  stdout: string
  stderr: string
  error?: string
  humanError?: string
}

export interface CircuitForgeAPI {
  listSerialPorts: () => Promise<SerialPortDescriptor[]>
  connectSerial: (path: string, baudRate: number) => Promise<boolean>
  disconnectSerial: () => Promise<boolean>
  sendSerialData: (data: string) => Promise<boolean>
  getConnectionState: () => Promise<ConnectionState>
  onSerialData: (callback: (data: string) => void) => () => void
  onConnectionStateChange: (callback: (state: ConnectionState) => void) => () => void

  // Compiler & Flashing Pipeline (Milestone v0.3)
  checkToolchain: () => Promise<ToolchainStatus>
  installToolchain: () => Promise<boolean>
  compileSketch: (code: string, fqbn: string) => Promise<CompileResult>
  uploadSketch: (code: string, fqbn: string, port: string) => Promise<UploadResult>
  onToolchainLog: (callback: (log: string) => void) => () => void
}
