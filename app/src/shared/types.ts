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

// Project File & Storage (Milestone v0.4 Phase 10)
export interface CircuitForgeProject {
  formatVersion: '1.0'
  name: string
  description?: string
  boardId: string
  baudRate: number
  workspace: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface SaveProjectResult {
  success: boolean
  filePath?: string
  canceled?: boolean
  error?: string
}

export interface OpenProjectResult {
  success: boolean
  project?: CircuitForgeProject
  filePath?: string
  canceled?: boolean
  error?: string
}

// AI Copilot & Hardware Explainer (Milestone v0.6 Phase 13)
export interface WiringStep {
  component: string
  boardPin: string
  componentPin: string
  wireColor: string
  notes?: string
}

export interface CircuitExplanation {
  summary: string
  logicFlow: string[]
  wiringTable: WiringStep[]
  powerNotes: string[]
  isAiGenerated: boolean
  error?: string
}

export interface ExplainCircuitRequest {
  boardId: string
  code: string
  blocksJson?: Record<string, unknown>
}

export interface AiApiKeyStatus {
  isConfigured: boolean
  maskedKey?: string
}

// AI Natural Language to Block Synthesis (Milestone v0.6 Phase 14)
export interface BlockSynthesisRequest {
  prompt: string
  boardId: string
  currentBlocksSummary?: string
  mode?: 'replace' | 'append'
}

export interface BlockSynthesisResult {
  success: boolean
  explanation: string
  blocks: Record<string, unknown>[]
  cppCode: string
  source: 'gemini' | 'offline'
  error?: string
  warnings?: string[]
}

// AI Code-to-Blocks Transpiler (Milestone v0.7 Phase 16)
export interface AiTranspileRequest {
  code: string
  boardId: string
}

export interface AiTranspileResult {
  success: boolean
  blocks: Record<string, unknown>[]
  explanation: string
  mappedComponents: string[]
  unmappedSnippetsCount: number
  detectedBaudRate?: number
  source: 'gemini' | 'offline'
  error?: string
  warnings?: string[]
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

  // Project Storage & File Operations (Milestone v0.4 Phase 10)
  saveProject: (project: CircuitForgeProject, filePath?: string) => Promise<SaveProjectResult>
  openProject: () => Promise<OpenProjectResult>

  // AI Hardware Copilot (Milestone v0.6 Phase 13 & 14)
  explainCircuit: (request: ExplainCircuitRequest) => Promise<CircuitExplanation>
  setAiApiKey: (apiKey: string) => Promise<boolean>
  getAiApiKeyStatus: () => Promise<AiApiKeyStatus>
  synthesizeBlocks: (request: BlockSynthesisRequest) => Promise<BlockSynthesisResult>

  // AI Code-to-Blocks Transpiler (Milestone v0.7 Phase 16)
  transpileSketch: (request: AiTranspileRequest) => Promise<AiTranspileResult>
}
