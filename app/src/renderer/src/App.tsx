import { useEffect, useState, useRef, useCallback } from 'react'
import type { SerialPortDescriptor, ConnectionState } from '@shared/types'

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400]

interface LogItem {
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

export default function App(): React.JSX.Element {
  // Theme state: dark | light (persisted to localStorage)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('cf-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  // Hardware Link & Port states
  const [ports, setPorts] = useState<SerialPortDescriptor[]>([])
  const [selectedPort, setSelectedPort] = useState<string>('')
  const [selectedBaud, setSelectedBaud] = useState<number>(115200)
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    path: null,
    baudRate: null
  })

  // Terminal states
  const [logs, setLogs] = useState<LogItem[]>([])
  const [sendText, setSendText] = useState<string>('')
  const [lineEnding, setLineEnding] = useState<string>('\r\n')
  const [autoScroll, setAutoScroll] = useState<boolean>(true)
  const [showTimestamps, setShowTimestamps] = useState<boolean>(true)
  const [isScanning, setIsScanning] = useState<boolean>(false)

  const logEndRef = useRef<HTMLDivElement>(null)

  // Synchronize theme attribute on HTML root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('cf-theme', theme)
  }, [theme])

  const toggleTheme = (): void => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

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

  // Initial setup and IPC listeners
  useEffect(() => {
    refreshPorts()

    window.api.getConnectionState().then((state) => {
      setConnectionState(state)
      if (state.path) setSelectedPort(state.path)
      if (state.baudRate) setSelectedBaud(state.baudRate)
    }).catch(console.error)

    const unsubData = window.api.onSerialData((data) => {
      const entry: LogItem = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        text: data,
        timestamp: getFormattedTime(),
        isSent: false
      }
      setLogs((prev) => [...prev.slice(-999), entry])
    })

    const unsubState = window.api.onConnectionStateChange((state) => {
      setConnectionState(state)
    })

    return () => {
      unsubData()
      unsubState()
    }
  }, [refreshPorts])

  // Auto-scroll terminal log
  useEffect(() => {
    if (autoScroll) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  // Handle Connect / Disconnect
  const toggleConnection = async (): Promise<void> => {
    if (connectionState.status === 'connected' || connectionState.status === 'connecting') {
      await window.api.disconnectSerial()
    } else {
      if (!selectedPort) return
      await window.api.connectSerial(selectedPort, selectedBaud)
    }
  }

  // Transmit command to device
  const handleSend = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!sendText || connectionState.status !== 'connected') return

    const payload = sendText + (lineEnding === 'none' ? '' : lineEnding)
    try {
      const success = await window.api.sendSerialData(payload)
      if (success) {
        const sentEntry: LogItem = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          text: sendText,
          timestamp: getFormattedTime(),
          isSent: true
        }
        setLogs((prev) => [...prev.slice(-999), sentEntry])
        setSendText('')
      }
    } catch (err) {
      console.error('Failed to send serial data:', err)
    }
  }

  const isConnected = connectionState.status === 'connected'
  const isConnecting = connectionState.status === 'connecting'
  const activePortDetails = ports.find((p) => p.path === (connectionState.path || selectedPort))

  return (
    <div className="cf-app">
      {/* Top Header & Hardware Controls */}
      <header className="cf-header">
        <div className="cf-brand">
          <span className="cf-brand-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <rect x="9" y="9" width="6" height="6" />
              <line x1="9" y1="1" x2="9" y2="4" />
              <line x1="15" y1="1" x2="15" y2="4" />
              <line x1="9" y1="20" x2="9" y2="23" />
              <line x1="15" y1="20" x2="15" y2="23" />
              <line x1="20" y1="9" x2="23" y2="9" />
              <line x1="20" y1="14" x2="23" y2="14" />
              <line x1="1" y1="9" x2="4" y2="9" />
              <line x1="1" y1="14" x2="4" y2="14" />
            </svg>
          </span>
          <span className="cf-brand-title">CircuitForge</span>
          <span className="cf-brand-version">v0.1</span>
        </div>

        <div className="cf-toolbar">
          {/* Port Selector */}
          <div className="cf-control">
            <label htmlFor="cf-port-select">PORT</label>
            <select
              id="cf-port-select"
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              disabled={isConnected || isConnecting}
            >
              {ports.length === 0 ? (
                <option value="">No Ports Detected</option>
              ) : (
                ports.map((p) => (
                  <option key={p.path} value={p.path}>
                    {p.friendlyName || p.path}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Refresh Ports Button */}
          <button
            className="cf-btn-sm"
            onClick={refreshPorts}
            disabled={isScanning || isConnected || isConnecting}
            title="Scan for connected hardware"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            <span>{isScanning ? 'Scanning' : 'Refresh'}</span>
          </button>

          {/* Baud Rate Picker */}
          <div className="cf-control">
            <label htmlFor="cf-baud-select">BAUD</label>
            <select
              id="cf-baud-select"
              value={selectedBaud}
              onChange={(e) => setSelectedBaud(Number(e.target.value))}
              disabled={isConnected || isConnecting}
            >
              {BAUD_RATES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Connect / Disconnect Action Button */}
          <button
            className={`cf-btn ${isConnected ? 'cf-btn-disconnect' : 'cf-btn-primary'}`}
            onClick={toggleConnection}
            disabled={isConnecting || (!selectedPort && !isConnected)}
          >
            {isConnecting ? 'Connecting' : isConnected ? 'Disconnect' : 'Connect'}
          </button>

          {/* Status Indicator */}
          <div className={`cf-status-badge cf-status-${connectionState.status}`}>
            <span className="cf-status-dot" aria-hidden="true" />
            <span className="cf-status-text">
              {connectionState.status.toUpperCase()}
            </span>
          </div>

          {/* Theme Toggle Button */}
          <button
            className="cf-btn-theme"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="cf-main">
        {/* Device Information Sidebar */}
        <aside className="cf-sidebar">
          <h3>Hardware Info</h3>
          <div className="cf-card">
            <div className="cf-info-row">
              <span className="cf-label">Target Port</span>
              <span className="cf-value">{selectedPort || 'None'}</span>
            </div>
            <div className="cf-info-row">
              <span className="cf-label">Baud Rate</span>
              <span className="cf-value">{selectedBaud} bps</span>
            </div>
            <div className="cf-info-row">
              <span className="cf-label">Status</span>
              <span className="cf-value cf-value-badge">{connectionState.status}</span>
            </div>
            <div className="cf-info-row">
              <span className="cf-label">Manufacturer</span>
              <span className="cf-value">{activePortDetails?.manufacturer || 'Unknown'}</span>
            </div>
            <div className="cf-info-row">
              <span className="cf-label">USB VID:PID</span>
              <span className="cf-value">
                {activePortDetails?.vendorId ? `${activePortDetails.vendorId}:${activePortDetails.productId}` : 'N/A'}
              </span>
            </div>
          </div>

          {connectionState.error && (
            <div className="cf-error-box">
              <strong>Connection Error</strong>
              <div>{connectionState.error}</div>
            </div>
          )}

          <div className="cf-card cf-tips-card">
            <h4>Instructions</h4>
            <ol>
              <li>Plug your microcontroller (Arduino, ESP32, Pico) into a USB port.</li>
              <li>Select the assigned COM port and Baud rate from the top bar.</li>
              <li>Click <strong>Connect</strong> to start two-way serial communication.</li>
            </ol>
          </div>
        </aside>

        {/* Live Serial Monitor Console */}
        <section className="cf-terminal-section">
          <div className="cf-terminal-header">
            <span>SERIAL MONITOR &middot; {logs.length} ENTRIES</span>
            <div className="cf-terminal-actions">
              <label className="cf-checkbox-label">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                />
                Auto-scroll
              </label>
              <label className="cf-checkbox-label">
                <input
                  type="checkbox"
                  checked={showTimestamps}
                  onChange={(e) => setShowTimestamps(e.target.checked)}
                />
                Timestamps
              </label>
              <button
                className="cf-btn-sm"
                onClick={() => setLogs([])}
                disabled={logs.length === 0}
              >
                Clear Log
              </button>
            </div>
          </div>

          <div className="cf-terminal-body">
            {logs.length === 0 ? (
              <div className="cf-empty-terminal">
                {isConnected
                  ? 'Connected. Waiting for incoming serial data from hardware...'
                  : 'Serial port disconnected. Select a port and click Connect.'}
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={log.isSent ? 'cf-terminal-line-sent' : 'cf-terminal-line'}>
                  {showTimestamps && <span className="cf-timestamp">[{log.timestamp}]</span>}
                  {log.isSent && <span className="cf-timestamp">[TX] &gt; </span>}
                  <span>{log.text}</span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>

          {/* Transmit Command Bar */}
          <form className="cf-terminal-footer" onSubmit={handleSend}>
            <select
              value={lineEnding}
              onChange={(e) => setLineEnding(e.target.value)}
              disabled={!isConnected}
              title="Line Ending"
            >
              <option value="\r\n">Both NL & CR (\r\n)</option>
              <option value="\n">Newline (\n)</option>
              <option value="\r">Carriage Return (\r)</option>
              <option value="none">No Line Ending</option>
            </select>

            <input
              type="text"
              placeholder={
                isConnected
                  ? 'Enter command to transmit to microcontroller (press Enter)...'
                  : 'Connect to a serial port to transmit data'
              }
              value={sendText}
              onChange={(e) => setSendText(e.target.value)}
              disabled={!isConnected}
            />

            <button
              type="submit"
              className="cf-btn cf-btn-primary"
              disabled={!isConnected || !sendText.trim()}
            >
              Send
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
