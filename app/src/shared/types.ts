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

export interface CircuitForgeAPI {
  listSerialPorts: () => Promise<SerialPortDescriptor[]>
  connectSerial: (path: string, baudRate: number) => Promise<boolean>
  disconnectSerial: () => Promise<boolean>
  sendSerialData: (data: string) => Promise<boolean>
  getConnectionState: () => Promise<ConnectionState>
  onSerialData: (callback: (data: string) => void) => () => void
  onConnectionStateChange: (callback: (state: ConnectionState) => void) => () => void
}
