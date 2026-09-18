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

  // Transmit command
  const handleSend = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!sendText) return
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

  const handleClearCanvas = (): void => {
    if (workspaceRef.current) {
      workspaceRef.current.clear()
      setBlockCount(0)
    }
  }

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
          <span className="cf-brand-version">v0.2</span>
        </div>

        {/* Center Layout View Mode Controls */}
        <div className="cf-view-modes" role="group" aria-label="Layout view mode">
          <button
            className={`cf-view-btn ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => setViewMode('split')}
            title="Split View (Canvas + Terminal)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            title="Full Terminal & Code"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <span>Panel</span>
          </button>
        </div>

        {/* Right Connection Controls & Theme */}
        <div className="cf-controls">
          <div className="cf-port-group">
            <select
              className="cf-select cf-port-select"
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              disabled={isConnected || isConnecting || ports.length === 0}
              title={selectedPort ? `Selected Port: ${selectedPort}` : 'No Port Selected'}
            >
              {ports.length === 0 ? (
                <option value="">No COM Ports Found</option>
              ) : (
                ports.map((p) => (
                  <option key={p.path} value={p.path}>
                    {p.path} {p.friendlyName && p.friendlyName !== p.path ? `(${p.friendlyName})` : ''}
                  </option>
                ))
              )}
            </select>

            <button
              className={`cf-btn cf-btn-icon ${isScanning ? 'scanning' : ''}`}
              onClick={refreshPorts}
              disabled={isConnected || isConnecting || isScanning}
              title="Rescan COM Ports"
              aria-label="Rescan COM Ports"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
          </div>

          <div className="cf-baud-group">
            <select
              className="cf-select cf-baud-select"
              value={selectedBaud}
              onChange={(e) => setSelectedBaud(Number(e.target.value))}
              disabled={isConnected || isConnecting}
              title="Serial Baud Rate"
            >
              {BAUD_RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate} baud
                </option>
              ))}
            </select>
          </div>

          <button
            className={`cf-btn cf-btn-connect ${isConnected ? 'connected' : ''} ${isConnecting ? 'connecting' : ''}`}
            onClick={toggleConnection}
            disabled={!selectedPort && !isConnected}
          >
            {isConnecting ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect'}
          </button>

          <div className="cf-theme-group">
            <button
              className="cf-btn cf-btn-icon"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle Theme"
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
        </div>
      </header>

      {/* Main Dual-Pane Workspace */}
      <main className={`cf-main view-${viewMode}`}>
        {/* Left Pane: Visual Blockly Canvas */}
        {viewMode !== 'terminal' && (
          <section className="cf-pane-canvas" aria-label="Visual programming workspace">
            <div className="cf-canvas-toolbar">
              <div className="cf-canvas-title">
                <span className="cf-canvas-dot" />
                <span>Visual Logic Workspace</span>
              </div>
              <div className="cf-canvas-stats">
                <span className="cf-badge cf-badge-counter">{blockCount} {blockCount === 1 ? 'block' : 'blocks'}</span>
                <button
                  className="cf-btn-toolbar"
                  onClick={handleZoomFit}
                  title="Center and fit all blocks in view"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                  <span>Fit View</span>
                </button>
                <button
                  className="cf-btn-toolbar cf-btn-toolbar-danger"
                  onClick={handleClearCanvas}
                  disabled={blockCount === 0}
                  title="Clear all blocks on workspace"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <div className="cf-canvas-container">
              <BlocklyWorkspace
                theme={theme}
                onWorkspaceChange={handleWorkspaceChange}
                workspaceRef={workspaceRef}
              />
            </div>
          </section>
        )}

        {/* Right Pane: Multi-tab Telemetry, Code Generator & Serial Terminal */}
        {viewMode !== 'canvas' && (
          <section className="cf-pane-terminal" aria-label="Code and Serial output panel">
            {/* Tab Navigation */}
            <div className="cf-tab-nav" role="tablist">
              <button
                className={`cf-tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
                onClick={() => setActiveTab('terminal')}
                role="tab"
                aria-selected={activeTab === 'terminal'}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
                <span>Serial Terminal</span>
                {logs.length > 0 && <span className="cf-tab-count">{logs.length}</span>}
              </button>

              <button
                className={`cf-tab-btn ${activeTab === 'code' ? 'active' : ''}`}
                onClick={() => setActiveTab('code')}
                role="tab"
                aria-selected={activeTab === 'code'}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
                <span>Generated C++</span>
              </button>

              <button
                className={`cf-tab-btn ${activeTab === 'device' ? 'active' : ''}`}
                onClick={() => setActiveTab('device')}
                role="tab"
                aria-selected={activeTab === 'device'}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                  <line x1="6" y1="6" x2="6.01" y2="6" />
                  <line x1="6" y1="18" x2="6.01" y2="18" />
                </svg>
                <span>Device Info</span>
              </button>
            </div>

            {/* TAB 1: Serial Terminal */}
            {activeTab === 'terminal' && (
              <div className="cf-tab-content cf-tab-terminal">
                <div className="cf-terminal-toolbar">
                  <div className="cf-terminal-options">
                    <label className="cf-checkbox-label">
                      <input
                        type="checkbox"
                        checked={autoScroll}
                        onChange={(e) => setAutoScroll(e.target.checked)}
                      />
                      <span>Auto-scroll</span>
                    </label>
                    <label className="cf-checkbox-label">
                      <input
                        type="checkbox"
                        checked={showTimestamps}
                        onChange={(e) => setShowTimestamps(e.target.checked)}
                      />
                      <span>Timestamps</span>
                    </label>
                  </div>
                  <button
                    className="cf-btn-toolbar"
                    onClick={clearLogs}
                    disabled={logs.length === 0}
                    title="Clear terminal logs"
                  >
                    Clear Log
                  </button>
                </div>

                <div className="cf-terminal-screen">
                  {logs.length === 0 ? (
                    <div className="cf-terminal-empty">
                      <p className="cf-terminal-empty-title">
                        {isConnected ? 'Connected. Waiting for serial data...' : 'Serial port disconnected'}
                      </p>
                      <p className="cf-terminal-empty-hint">
                        {isConnected
                          ? `Listening on ${connectionState.path} at ${connectionState.baudRate} baud.`
                          : 'Select a COM port and click Connect to start monitoring hardware output.'}
                      </p>
                    </div>
                  ) : (
                    <div className="cf-terminal-lines">
                      {logs.map((log) => (
                        <div key={log.id} className={`cf-terminal-line ${log.isSent ? 'sent' : ''}`}>
                          {showTimestamps && (
                            <span className="cf-timestamp">{log.timestamp}</span>
                          )}
                          <span className="cf-line-content">{log.text}</span>
                        </div>
                      ))}
                      <div ref={logEndRef} />
                    </div>
                  )}
                </div>

                {/* Transmit Command Input */}
                <form className="cf-transmit-bar" onSubmit={handleSend}>
                  <input
                    type="text"
                    className="cf-input cf-transmit-input"
                    placeholder={isConnected ? 'Send message or command to device...' : 'Connect to device to transmit...'}
                    value={sendText}
                    onChange={(e) => setSendText(e.target.value)}
                    disabled={!isConnected}
                  />
                  <select
                    className="cf-select cf-ending-select"
                    value={lineEnding}
                    onChange={(e) => setLineEnding(e.target.value)}
                    disabled={!isConnected}
                    title="Line Ending sequence"
                  >
                    <option value="\r\n">Both (\r\n)</option>
                    <option value="\n">Newline (\n)</option>
                    <option value="\r">Carriage Return (\r)</option>
                    <option value="none">No Ending</option>
                  </select>
                  <button
                    type="submit"
                    className="cf-btn cf-btn-send"
                    disabled={!isConnected || !sendText.trim()}
                  >
                    Send
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: Live Generated C++ Preview */}
            {activeTab === 'code' && (
              <div className="cf-tab-content cf-tab-code">
                <div className="cf-code-header">
                  <div className="cf-code-title">
                    <span className="cf-code-lang">ARDUINO C++</span>
                    <span className="cf-badge cf-badge-target">Uno / ESP32</span>
                  </div>
                  <div className="cf-code-actions">
                    <button
                      className="cf-btn-toolbar"
                      onClick={copyGeneratedCode}
                      title="Copy code to clipboard"
                    >
                      {copiedCode ? '✓ Copied' : 'Copy Code'}
                    </button>
                    <button
                      className="cf-btn-toolbar cf-btn-toolbar-accent"
                      onClick={handleExportIno}
                      title="Download as .ino Arduino sketch"
                    >
                      Export .ino
                    </button>
                  </div>
                </div>
                <div className="cf-code-viewer">
                  <pre className="cf-code-pre">
                    <code>{generatedCode || '// Arrange blocks on the canvas to generate firmware code.\n'}</code>
                  </pre>
                </div>
              </div>
            )}

            {/* TAB 3: Device Metadata Info */}
            {activeTab === 'device' && (
              <div className="cf-tab-content cf-tab-device">
                <div className="cf-device-card">
                  <h3 className="cf-device-card-title">Port Information</h3>
                  {activePortDetails ? (
                    <div className="cf-device-details">
                      <div className="cf-device-row">
                        <span className="cf-device-key">Port Path</span>
                        <span className="cf-device-val">{activePortDetails.path}</span>
                      </div>
                      <div className="cf-device-row">
                        <span className="cf-device-key">Friendly Name</span>
                        <span className="cf-device-val">{activePortDetails.friendlyName}</span>
                      </div>
                      <div className="cf-device-row">
                        <span className="cf-device-key">Manufacturer</span>
                        <span className="cf-device-val">{activePortDetails.manufacturer || 'Unknown'}</span>
                      </div>
                      <div className="cf-device-row">
                        <span className="cf-device-key">Vendor ID</span>
                        <span className="cf-device-val">{activePortDetails.vendorId || 'N/A'}</span>
                      </div>
                      <div className="cf-device-row">
                        <span className="cf-device-key">Product ID</span>
                        <span className="cf-device-val">{activePortDetails.productId || 'N/A'}</span>
                      </div>
                      <div className="cf-device-row">
                        <span className="cf-device-key">Baud Rate</span>
                        <span className="cf-device-val">{selectedBaud} bps</span>
                      </div>
                    </div>
                  ) : (
                    <p className="cf-device-empty">No device currently selected or connected.</p>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Bottom Status Bar */}
      <footer className="cf-footer">
        <div className="cf-footer-left">
          <div className={`cf-status-badge cf-status-${connectionState.status}`}>
            <span className="cf-status-dot" aria-hidden="true" />
            <span className="cf-status-text">
              {connectionState.status === 'connected'
                ? `Connected: ${connectionState.path} @ ${connectionState.baudRate} bps`
                : connectionState.status === 'connecting'
                ? `Connecting to ${connectionState.path}...`
                : connectionState.status === 'error'
                ? `Error: ${connectionState.error || 'Connection Failed'}`
                : 'Hardware Disconnected'}
            </span>
          </div>
        </div>

        <div className="cf-footer-right">
          <span className="cf-footer-stat">Target: Arduino Uno / ESP32</span>
          <span className="cf-footer-sep">|</span>
          <span className="cf-footer-stat">Vite + React 19 + Electron 39</span>
        </div>
      </footer>
    </div>
  )
}
