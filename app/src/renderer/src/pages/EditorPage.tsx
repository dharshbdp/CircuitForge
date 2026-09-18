import { useState, useRef, useEffect, useCallback } from 'react'
import type * as Blockly from 'blockly'
import BlocklyWorkspace from '../components/BlocklyWorkspace'
import { arduinoGenerator } from '@core/compiler'
import { useSerial, useTheme } from '../hooks'

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400]

export function EditorPage(): React.JSX.Element {
  const [theme, toggleTheme] = useTheme()
  const {
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
  } = useSerial()

  // Layout & Workspace states
  const [viewMode, setViewMode] = useState<'split' | 'canvas' | 'terminal'>('split')
  const [activeTab, setActiveTab] = useState<'terminal' | 'code' | 'device'>('terminal')
  const [blockCount, setBlockCount] = useState<number>(0)
  const [copiedCode, setCopiedCode] = useState<boolean>(false)
  const [generatedCode, setGeneratedCode] = useState<string>('')

  // Terminal input & settings
  const [sendText, setSendText] = useState<string>('')
  const [lineEnding, setLineEnding] = useState<string>('\r\n')
  const [autoScroll, setAutoScroll] = useState<boolean>(true)
  const [showTimestamps, setShowTimestamps] = useState<boolean>(true)

  const logEndRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)

  // Auto-scroll terminal log
  useEffect(() => {
    if (autoScroll && activeTab === 'terminal') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll, activeTab])

  // Transmit command to device
  const handleSend = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!sendText || connectionState.status !== 'connected') return

    const success = await sendData(sendText, lineEnding)
    if (success) {
      setSendText('')
    }
  }

  // Blockly workspace change handler & live code generator
  const handleWorkspaceChange = useCallback((workspace: Blockly.WorkspaceSvg): void => {
    const count = workspace.getAllBlocks(false).length
    setBlockCount(count)
    try {
      const code = arduinoGenerator.workspaceToCode(workspace)
      setGeneratedCode(code)
    } catch (err) {
      console.error('Failed to generate Arduino code:', err)
    }
  }, [])

  // Clear workspace canvas
  const handleClearCanvas = (): void => {
    if (workspaceRef.current) {
      workspaceRef.current.clear()
      setBlockCount(0)
    }
  }

  // Zoom to fit / Center
  const handleZoomFit = (): void => {
    if (workspaceRef.current) {
      workspaceRef.current.zoomToFit()
    }
  }

  const handleExportIno = (): void => {
    const blob = new Blob([generatedCode], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'circuitforge_sketch.ino'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const copyGeneratedCode = (): void => {
    navigator.clipboard.writeText(generatedCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
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
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
          <span className="cf-brand-version">v0.2</span>
        </div>

        {/* Center Layout View Mode Controls */}
        <div className="cf-view-modes" role="group" aria-label="Layout view mode">
          <button
            className={`cf-view-btn ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => setViewMode('split')}
            title="Split View (Canvas + Terminal)"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
            <span>Split</span>
          </button>
          <button
            className={`cf-view-btn ${viewMode === 'canvas' ? 'active' : ''}`}
            onClick={() => setViewMode('canvas')}
            title="Full Visual Canvas"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>Canvas</span>
          </button>
          <button
            className={`cf-view-btn ${viewMode === 'terminal' ? 'active' : ''}`}
            onClick={() => setViewMode('terminal')}
            title="Full Console & Telemetry"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <span>Console</span>
          </button>
        </div>

        {/* Right Toolbar Controls */}
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
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
            <span className="cf-status-text">{connectionState.status.toUpperCase()}</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            className="cf-btn-theme"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Main Dual-Pane Workspace */}
      <main className={`cf-main-split view-${viewMode}`}>
        {/* Left Pane: Visual Block Canvas */}
        <section className="cf-canvas-pane">
          <div className="cf-canvas-header">
            <div className="cf-canvas-title-group">
              <span className="cf-pane-title">VISUAL LOGIC CANVAS</span>
              <span className="cf-badge">{blockCount} BLOCKS</span>
            </div>
            <div className="cf-canvas-actions">
              <button
                className="cf-btn-sm"
                onClick={handleZoomFit}
                title="Zoom canvas to fit all blocks"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 3h6v6" />
                  <path d="M9 21H3v-6" />
                  <path d="M21 3l-7 7" />
                  <path d="M3 21l7-7" />
                </svg>
                <span>Fit</span>
              </button>
              <button
                className="cf-btn-sm"
                onClick={handleClearCanvas}
                disabled={blockCount === 0}
                title="Clear all blocks from canvas"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Clear</span>
              </button>
            </div>
          </div>

          <div className="cf-canvas-body">
            <BlocklyWorkspace
              theme={theme}
              workspaceRef={workspaceRef}
              onWorkspaceChange={handleWorkspaceChange}
            />
          </div>
        </section>

        {/* Right Pane: Inspector & Engineering Tools */}
        <section className="cf-inspector-pane">
          {/* Tab Switcher */}
          <div className="cf-inspector-header">
            <div className="cf-tabs" role="tablist">
              <button
                className={`cf-tab ${activeTab === 'terminal' ? 'active' : ''}`}
                onClick={() => setActiveTab('terminal')}
                role="tab"
                aria-selected={activeTab === 'terminal'}
              >
                <span>MONITOR</span>
                <span className="cf-tab-badge">{logs.length}</span>
              </button>
              <button
                className={`cf-tab ${activeTab === 'code' ? 'active' : ''}`}
                onClick={() => setActiveTab('code')}
                role="tab"
                aria-selected={activeTab === 'code'}
              >
                <span>CODE</span>
              </button>
              <button
                className={`cf-tab ${activeTab === 'device' ? 'active' : ''}`}
                onClick={() => setActiveTab('device')}
                role="tab"
                aria-selected={activeTab === 'device'}
              >
                <span>DEVICE</span>
              </button>
            </div>
          </div>

          {/* Tab Content: Live Serial Monitor */}
          {activeTab === 'terminal' && (
            <div className="cf-tab-content cf-tab-terminal">
              <div className="cf-terminal-header">
                <span>SERIAL STREAM &middot; {connectionState.baudRate || selectedBaud} BPS</span>
                <div className="cf-terminal-actions">
                  <label className="cf-checkbox-label">
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                    />
                    Scroll
                  </label>
                  <label className="cf-checkbox-label">
                    <input
                      type="checkbox"
                      checked={showTimestamps}
                      onChange={(e) => setShowTimestamps(e.target.checked)}
                    />
                    Time
                  </label>
                  <button className="cf-btn-sm" onClick={clearLogs} disabled={logs.length === 0}>
                    Clear
                  </button>
                </div>
              </div>

              <div className="cf-terminal-body">
                {logs.length === 0 ? (
                  <div className="cf-empty-terminal">
                    {isConnected
                      ? 'Connected. Waiting for incoming telemetry from hardware...'
                      : 'Serial port disconnected. Select a port and click Connect.'}
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className={log.isSent ? 'cf-terminal-line-sent' : 'cf-terminal-line'}
                    >
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
                  <option value="\r\n">NL & CR (\r\n)</option>
                  <option value="\n">NL (\n)</option>
                  <option value="\r">CR (\r)</option>
                  <option value="none">No Ending</option>
                </select>

                <input
                  type="text"
                  placeholder={
                    isConnected
                      ? 'Transmit command to microcontroller (Enter)...'
                      : 'Connect port to transmit data'
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
            </div>
          )}

          {/* Tab Content: Code Preview */}
          {activeTab === 'code' && (
            <div className="cf-tab-content cf-tab-code">
              <div className="cf-code-header">
                <span className="cf-code-lang">ARDUINO C++ / INO</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="cf-btn-sm"
                    onClick={copyGeneratedCode}
                    title="Copy code to clipboard"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    className="cf-btn-sm"
                    onClick={handleExportIno}
                    title="Download .ino sketch file"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Export .ino</span>
                  </button>
                </div>
              </div>
              <pre className="cf-code-view">
                <code>{generatedCode}</code>
              </pre>
            </div>
          )}

          {/* Tab Content: Device Info */}
          {activeTab === 'device' && (
            <div className="cf-tab-content cf-tab-device">
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
                  <span className="cf-label">Connection</span>
                  <span className="cf-value cf-value-badge">{connectionState.status}</span>
                </div>
                <div className="cf-info-row">
                  <span className="cf-label">Manufacturer</span>
                  <span className="cf-value">{activePortDetails?.manufacturer || 'Unknown'}</span>
                </div>
                <div className="cf-info-row">
                  <span className="cf-label">USB VID:PID</span>
                  <span className="cf-value">
                    {activePortDetails?.vendorId
                      ? `${activePortDetails.vendorId}:${activePortDetails.productId}`
                      : 'N/A'}
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
                <h4>Quick Guide</h4>
                <ol>
                  <li>Connect your microcontroller (Arduino, ESP32, RP2040) via USB.</li>
                  <li>Drag visual blocks from the left toolbox onto the canvas.</li>
                  <li>
                    Click <strong>CODE</strong> tab to preview synthesized sketch.
                  </li>
                  <li>
                    Click <strong>MONITOR</strong> tab for real-time serial telemetry and debugging.
                  </li>
                </ol>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
