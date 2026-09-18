import { useState, useEffect, useCallback } from 'react'
import type { SerialPortDescriptor, ConnectionState } from '@shared/types'

export interface LogItem {
  id: string
  text: string
  timestamp: string
  isSent?: boolean
}

function getFormattedTime(): string {
  const now = new Date()
  const time = now.toLocaleTimeString('en-US', { hour12: false })
  const ms = String(now.getMilliseconds()).padStart(3, '0')
  return `${time}.${ms}`
}

export interface UseSerialReturn {
  ports: SerialPortDescriptor[]
  selectedPort: string
  setSelectedPort: React.Dispatch<React.SetStateAction<string>>
  selectedBaud: number
  setSelectedBaud: React.Dispatch<React.SetStateAction<number>>
  connectionState: ConnectionState
  logs: LogItem[]
  isScanning: boolean
  refreshPorts: () => Promise<void>
  toggleConnection: () => Promise<void>
  sendData: (text: string, lineEnding: string) => Promise<boolean>
  clearLogs: () => void
}

export function useSerial(): UseSerialReturn {
  const [ports, setPorts] = useState<SerialPortDescriptor[]>([])
  const [selectedPort, setSelectedPort] = useState<string>('')
  const [selectedBaud, setSelectedBaud] = useState<number>(115200)
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    path: null,
    baudRate: null
  })
  const [logs, setLogs] = useState<LogItem[]>([])
  const [isScanning, setIsScanning] = useState<boolean>(false)

  // Enumerate COM ports
  const refreshPorts = useCallback(async (): Promise<void> => {
    setIsScanning(true)
    try {
      const portList = await window.api.listSerialPorts()
      setPorts(portList)
      if (portList.length > 0) {
        setSelectedPort((current) => {
          const stillExists = portList.some((p) => p.path === current)
          return stillExists ? current : portList[0].path
        })
      } else {
        setSelectedPort('')
      }
    } catch (err) {
      console.error('Failed to enumerate serial ports:', err)
    } finally {
      setIsScanning(false)
    }
  }, [])

  // Initial setup & IPC subscriptions
  useEffect(() => {
    let isMounted = true

    window.api
      .listSerialPorts()
      .then((portList) => {
        if (!isMounted) return
        setPorts(portList)
        if (portList.length > 0) {
          setSelectedPort((current) => {
            const stillExists = portList.some((p) => p.path === current)
            return stillExists ? current : portList[0].path
          })
        }
      })
      .catch((err) => {
        console.error('Failed to list serial ports:', err)
      })

    window.api
      .getConnectionState()
      .then((state) => {
        if (!isMounted) return
        setConnectionState(state)
        if (state.path) setSelectedPort(state.path)
        if (state.baudRate) setSelectedBaud(state.baudRate)
      })
      .catch(console.error)

    const unsubData = window.api.onSerialData((data) => {
      setLogs((prev) => [
        ...prev.slice(-499),
        {
          id: Math.random().toString(36).substring(2, 9),
          text: data,
          timestamp: getFormattedTime()
        }
      ])
    })

    const unsubState = window.api.onConnectionStateChange((state) => {
      setConnectionState(state)
    })

    return () => {
      isMounted = false
      unsubData()
      unsubState()
    }
  }, [])

  // Connect or disconnect toggle
  const toggleConnection = async (): Promise<void> => {
    if (connectionState.status === 'connected' || connectionState.status === 'connecting') {
      await window.api.disconnectSerial()
    } else {
      if (!selectedPort) return
      await window.api.connectSerial(selectedPort, selectedBaud)
    }
  }

  // Send data to device
  const sendData = async (text: string, lineEnding: string): Promise<boolean> => {
    if (!text || connectionState.status !== 'connected') return false
    const payload = `${text}${lineEnding === 'none' ? '' : lineEnding}`
    const success = await window.api.sendSerialData(payload)
    if (success) {
      setLogs((prev) => [
        ...prev.slice(-499),
        {
          id: Math.random().toString(36).substring(2, 9),
          text: payload,
          timestamp: getFormattedTime(),
          isSent: true
        }
      ])
      return true
    }
    return false
  }

  const clearLogs = (): void => {
    setLogs([])
  }

  return {
    ports,
    selectedPort,
    setSelectedPort,
    selectedBaud,
    setSelectedBaud,
    connectionState,
    logs,
    isScanning,
    refreshPorts,
    toggleConnection,
    sendData,
    clearLogs
  }
}
