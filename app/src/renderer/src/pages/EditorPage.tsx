import { useState, useRef, useEffect, useCallback } from 'react'
import type * as Blockly from 'blockly'
import BlocklyWorkspace from '../components/BlocklyWorkspace'
import { arduinoGenerator, micropythonGenerator } from '@core/compiler'
import { loadWorkspace, serializeWorkspace } from '@core/graph/graphSerializer'
import { SUPPORTED_BOARDS } from '@hardware'
import type { CompileResult, CircuitForgeProject } from '@shared/types'
import { useSerial, useTheme, useTelemetry } from '../hooks'
import { TelemetryDashboard } from '../components/TelemetryDashboard'
import StarterLibraryModal from '../components/StarterLibraryModal'
import type { StarterProject } from '../data/starterProjects'

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
  const [activeTab, setActiveTab] = useState<
    'terminal' | 'code' | 'device' | 'build' | 'telemetry'
  >('terminal')
  const [blockCount, setBlockCount] = useState<number>(0)
  const [copiedCode, setCopiedCode] = useState<boolean>(false)

  // Real-Time Sensor Telemetry Hook
  const telemetry = useTelemetry()
  const [selectedBoard, setSelectedBoard] = useState<string>('arduino_uno')
  const [selectedLanguage, setSelectedLanguage] = useState<'cpp' | 'python'>('cpp')
  const [cppCode, setCppCode] = useState<string>('')
  const [pythonCode, setPythonCode] = useState<string>('')

  // Build & Toolchain states
  const [isCompiling, setIsCompiling] = useState<boolean>(false)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [buildStatus, setBuildStatus] = useState<'success' | 'error' | null>(null)
  const [buildStats, setBuildStats] = useState<CompileResult | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [compilerLogs, setCompilerLogs] = useState<string[]>([])

  // Project Management States (Milestone v0.4 Phase 10)
  const [projectName, setProjectName] = useState<string>('Untitled Project')
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState<boolean>(false)
  const [isStarterModalOpen, setIsStarterModalOpen] = useState<boolean>(false)
  const [projectNotification, setProjectNotification] = useState<string | null>(null)
  const isProgrammaticLoadRef = useRef<boolean>(false)

  // Terminal input & settings
  const [sendText, setSendText] = useState<string>('')
  const [lineEnding, setLineEnding] = useState<string>('\r\n')
  const [autoScroll, setAutoScroll] = useState<boolean>(true)
  const [showTimestamps, setShowTimestamps] = useState<boolean>(true)

  const logEndRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)

  const showNotification = (msg: string): void => {
    setProjectNotification(msg)
    setTimeout(() => setProjectNotification(null), 3000)
  }

  // Auto-scroll terminal log
  useEffect(() => {
    if (autoScroll && activeTab === 'terminal') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll, activeTab])

  // Subscribe to toolchain compiler logs
  useEffect(() => {
    if (!window.api?.onToolchainLog) return
    const unsubscribe = window.api.onToolchainLog((log: string) => {
      setCompilerLogs((prev) => [...prev, log.trimEnd()])
    })
    return () => unsubscribe()
  }, [])

  // Transmit command to device
  const handleSend = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!sendText || connectionState.status !== 'connected') return

    const success = await sendData(sendText, lineEnding)
    if (success) {
      setSendText('')
    }
  }

  // Blockly workspace change handler & live dual code generator
  const handleWorkspaceChange = useCallback((workspace: Blockly.WorkspaceSvg): void => {
    const count = workspace.getAllBlocks(false).length
    setBlockCount(count)
    if (isProgrammaticLoadRef.current) {
      isProgrammaticLoadRef.current = false
    } else {
      setIsDirty(true)
    }
    try {
      const cpp = arduinoGenerator.workspaceToCode(workspace)
      setCppCode(cpp)
    } catch (err) {
      console.error('Failed to generate Arduino C++ code:', err)
    }
    try {
      const py = micropythonGenerator.workspaceToCode(workspace)
      setPythonCode(py)
    } catch (err) {
      console.error('Failed to generate MicroPython code:', err)
    }
  }, [])

  // Project Operations: New, Save, Save As, Open, Load Template
  const handleNewProject = (): void => {
    if (isDirty && !window.confirm('You have unsaved changes. Create a new project anyway?')) {
      return
    }
    isProgrammaticLoadRef.current = true
    workspaceRef.current?.clear()
    setBlockCount(0)
    setProjectName('Untitled Project')
    setCurrentFilePath(null)
    setIsDirty(false)
    showNotification('New project created')
  }

  const handleSaveProject = async (saveAs = false): Promise<void> => {
    if (!workspaceRef.current) return
    const serialized = serializeWorkspace(workspaceRef.current)
    const projectData: CircuitForgeProject = {
      formatVersion: '1.0',
      name: projectName,
      boardId: selectedBoard,
      baudRate: selectedBaud,
      workspace: serialized.state,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const targetPath = saveAs ? undefined : currentFilePath || undefined
    const result = await window.api.saveProject(projectData, targetPath)

    if (result.success && result.filePath) {
      setCurrentFilePath(result.filePath)
      const baseName =
        result.filePath
          .split(/[\\/]/)
          .pop()
          ?.replace(/\.circuitforge$/i, '') || projectName
      setProjectName(baseName)
      setIsDirty(false)
      showNotification(`Saved: ${baseName}.circuitforge`)
    } else if (result.error) {
      showNotification(`Save Error: ${result.error}`)
    }
  }

  const handleOpenProject = async (): Promise<void> => {
    if (isDirty && !window.confirm('You have unsaved changes. Open another project anyway?')) {
      return
    }
    const result = await window.api.openProject()
    if (result.success && result.project && result.filePath) {
      isProgrammaticLoadRef.current = true
      if (workspaceRef.current) {
        loadWorkspace(workspaceRef.current, {
          version: '1.0',
          timestamp: result.project.updatedAt,
          blockCount: 0,
          state: result.project.workspace
        })
      }
      setProjectName(result.project.name || 'Untitled Project')
      setCurrentFilePath(result.filePath)
      if (result.project.boardId) {
        setSelectedBoard(result.project.boardId)
      }
      if (result.project.baudRate) {
        setSelectedBaud(result.project.baudRate)
      }
      setIsDirty(false)
      showNotification(`Opened: ${result.project.name}`)
    } else if (result.error) {
      showNotification(`Open Error: ${result.error}`)
    }
  }

  const handleSelectStarterProject = (starter: StarterProject): void => {
    if (isDirty && !window.confirm('You have unsaved changes. Load this template anyway?')) {
      return
    }
    isProgrammaticLoadRef.current = true
    if (workspaceRef.current) {
      loadWorkspace(workspaceRef.current, {
        version: '1.0',
        timestamp: starter.project.updatedAt,
        blockCount: 0,
        state: starter.project.workspace
      })
    }
    setProjectName(starter.name)
    setCurrentFilePath(null)
    setSelectedBoard(starter.boardId)
    setSelectedBaud(starter.baudRate)
    setIsDirty(false)
    setIsStarterModalOpen(false)
    showNotification(`Loaded template: ${starter.name}`)
  }

  // Keyboard Shortcuts: Ctrl+S (Save), Ctrl+Shift+S (Save As), Ctrl+O (Open), Ctrl+N (New)
  const projectHandlersRef = useRef({
    handleSaveProject,
    handleOpenProject,
    handleNewProject
  })

  useEffect(() => {
    projectHandlersRef.current = {
      handleSaveProject,
      handleOpenProject,
      handleNewProject
    }
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (e.shiftKey) {
          projectHandlersRef.current.handleSaveProject(true)
        } else {
          projectHandlersRef.current.handleSaveProject(false)
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        projectHandlersRef.current.handleOpenProject()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        projectHandlersRef.current.handleNewProject()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Clear workspace canvas
  const handleClearCanvas = (): void => {
    if (workspaceRef.current) {
      workspaceRef.current.clear()
      setBlockCount(0)
      setIsDirty(true)
    }
  }

  // Zoom to fit / Center
  const handleZoomFit = (): void => {
    if (workspaceRef.current) {
      workspaceRef.current.zoomToFit()
    }
  }

  const activeCode = selectedLanguage === 'cpp' ? cppCode : pythonCode

  const handleExportCode = (): void => {
    const isPy = selectedLanguage === 'python'
    const filename = isPy ? 'main.py' : 'circuitforge_sketch.ino'
    const mimeType = isPy ? 'text/x-python;charset=utf-8' : 'text/plain;charset=utf-8'
    const blob = new Blob([activeCode], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const copyGeneratedCode = (): void => {
    navigator.clipboard.writeText(activeCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const isConnected = connectionState.status === 'connected'
  const isConnecting = connectionState.status === 'connecting'
  const activePortDetails = ports.find((p) => p.path === (connectionState.path || selectedPort))
  const activeBoard = SUPPORTED_BOARDS.find((b) => b.id === selectedBoard) || SUPPORTED_BOARDS[0]

  // Compile / Verify handler
  const handleCompile = async (): Promise<void> => {
    if (isCompiling || isUploading || !window.api) return
    setIsCompiling(true)
    setBuildStatus(null)
    setLastError(null)
    setActiveTab('build')
    setCompilerLogs((prev) => [
      ...prev,
      `[START] Initiating code verification on ${activeBoard.name}...`
    ])

    try {
      const result = await window.api.compileSketch(cppCode, activeBoard.fqbn)
      if (result.success) {
        setBuildStatus('success')
        setBuildStats(result)
        setCompilerLogs((prev) => [
          ...prev,
          `[DONE] Build succeeded! Program size: ${result.binarySize || 'N/A'} bytes.`
        ])
      } else {
        setBuildStatus('error')
        setLastError(result.humanError || result.stderr)
        setCompilerLogs((prev) => [...prev, `[FAILED] Compilation terminated with errors.`])
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setBuildStatus('error')
      setLastError(msg)
      setCompilerLogs((prev) => [...prev, `[ERROR] ${msg}`])
    } finally {
      setIsCompiling(false)
    }
  }

  // Upload / Flash handler
  const handleUpload = async (): Promise<void> => {
    if (isCompiling || isUploading || !window.api) return
    if (!selectedPort) {
      setLastError('No serial port selected. Connect your board and select a COM port first.')
      setActiveTab('build')
      return
    }

    setIsUploading(true)
    setBuildStatus(null)
    setLastError(null)
    setActiveTab('build')
    setCompilerLogs((prev) => [
      ...prev,
      `[START] Initiating compile and upload to ${selectedPort} (${activeBoard.name})...`
    ])

    try {
      const result = await window.api.uploadSketch(cppCode, activeBoard.fqbn, selectedPort)
      if (result.success) {
        setBuildStatus('success')
        setCompilerLogs((prev) => [
          ...prev,
          `[DONE] Firmware flashed successfully! Resuming serial telemetry...`
        ])
      } else {
        setBuildStatus('error')
        setLastError(result.humanError || result.stderr)
        setCompilerLogs((prev) => [...prev, `[FAILED] Upload failed.`])
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setBuildStatus('error')
      setLastError(msg)
      setCompilerLogs((prev) => [...prev, `[ERROR] ${msg}`])
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="cf-app">
      {/* Top Header Panel: 2-Line Architecture */}
      <header className="cf-header">
        {/* Line 1: Basic Functions, View Modes, Status & Theme */}
        <div className="cf-header-row cf-header-row-top">
          {/* Brand & Project Controls */}
          <div className="cf-brand-group">
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
              <span className="cf-brand-version">v0.5</span>
            </div>

            <div className="cf-project-divider" />

            {/* Project File Management */}
            <div className="cf-project-bar">
              <div className="cf-project-title-box">
                <input
                  type="text"
                  className="cf-project-name-input"
                  value={projectName}
                  onChange={(e) => {
                    setProjectName(e.target.value)
                    setIsDirty(true)
                  }}
                  title="Click to rename project"
                />
                {isDirty && <span className="cf-dirty-dot" title="Unsaved changes" />}
              </div>

              <div className="cf-project-btn-group">
                <button
                  className="cf-btn-project"
                  onClick={handleNewProject}
                  title="New Project (Ctrl+N)"
                >
                  New
                </button>
                <button
                  className="cf-btn-project"
                  onClick={handleOpenProject}
                  title="Open Project (Ctrl+O)"
                >
                  Open
                </button>
                <button
                  className="cf-btn-project cf-btn-project-save"
                  onClick={() => handleSaveProject(false)}
                  title="Save Project (Ctrl+S)"
                >
                  Save
                </button>
                <button
                  className="cf-btn-project"
                  onClick={() => handleSaveProject(true)}
                  title="Save As... (Ctrl+Shift+S)"
                >
                  Save As
                </button>
                <button
                  className="cf-btn-project cf-btn-project-templates"
                  onClick={() => setIsStarterModalOpen(true)}
                  title="Browse Starter Project Templates"
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  <span>Templates</span>
                </button>
              </div>
            </div>
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

          {/* Right Controls: Connection Status Badge & Theme Switcher */}
          <div className="cf-top-meta">
            <div className={`cf-status-badge cf-status-${connectionState.status}`}>
              <span className="cf-status-dot" aria-hidden="true" />
              <span className="cf-status-text">{connectionState.status.toUpperCase()}</span>
            </div>

            <button
              className="cf-btn-theme"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 00-1.41-1.41l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 00-1.41-1.41l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.3 2a10 10 0 0 0-.19 14 9.92 9.92 0 0 0 7.9 4 9.59 9.59 0 0 0 1.99-.21A10 10 0 1 1 12.3 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Line 2: Action Ribbon - Code Verification, Upload & Board Functions */}
        <div className="cf-header-row cf-header-row-bottom">
          {/* Left: Code Verification & Upload Actions */}
          <div className="cf-action-group">
            <button
              className="cf-btn-action cf-btn-verify"
              onClick={handleCompile}
              disabled={isCompiling || isUploading || blockCount === 0}
              title="Verify / Compile visual code (Check syntax & build)"
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
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{isCompiling ? 'Verifying...' : 'Verify'}</span>
            </button>

            <button
              className="cf-btn-action cf-btn-upload"
              onClick={handleUpload}
              disabled={isCompiling || isUploading || blockCount === 0 || !selectedPort}
              title={
                !selectedPort
                  ? 'Connect a microcontroller and select a COM port to upload'
                  : 'Compile and Upload sketch to microcontroller'
              }
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
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
              <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
            </button>
          </div>

          {/* Right: Board & Hardware Serial Functions */}
          <div className="cf-hardware-bar">
            {/* Target Board Selector */}
            <div className="cf-control">
              <label htmlFor="cf-board-select">BOARD</label>
              <select
                id="cf-board-select"
                value={selectedBoard}
                onChange={(e) => setSelectedBoard(e.target.value)}
                title="Select Target Microcontroller Board"
              >
                {SUPPORTED_BOARDS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

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
          </div>
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
                className={`cf-tab ${activeTab === 'build' ? 'active' : ''}`}
                onClick={() => setActiveTab('build')}
                role="tab"
                aria-selected={activeTab === 'build'}
              >
                <span>BUILD</span>
                {buildStatus && (
                  <span
                    className={`cf-tab-dot ${buildStatus === 'success' ? 'cf-dot-success' : 'cf-dot-error'}`}
                  />
                )}
              </button>

              <button
                className={`cf-tab ${activeTab === 'telemetry' ? 'active' : ''}`}
                onClick={() => setActiveTab('telemetry')}
                role="tab"
                aria-selected={activeTab === 'telemetry'}
              >
                <span>TELEMETRY</span>
                {telemetry.channels.length > 0 && (
                  <span className="cf-tab-badge">{telemetry.channels.length}</span>
                )}
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

          {/* Tab Content: Real-Time Telemetry & Oscilloscope */}
          {activeTab === 'telemetry' && (
            <TelemetryDashboard
              history={telemetry.history}
              channels={telemetry.channels}
              isRecording={telemetry.isRecording}
              setIsRecording={telemetry.setIsRecording}
              clearTelemetry={telemetry.clearTelemetry}
              exportCSV={telemetry.exportCSV}
              exportJSON={telemetry.exportJSON}
              isConnected={isConnected}
            />
          )}

          {/* Tab Content: Code Preview */}
          {activeTab === 'code' && (
            <div className="cf-tab-content cf-tab-code">
              <div className="cf-code-header">
                <div
                  className="cf-lang-switcher"
                  role="group"
                  aria-label="Target programming language"
                >
                  <button
                    type="button"
                    className={`cf-lang-btn ${selectedLanguage === 'cpp' ? 'active' : ''}`}
                    onClick={() => setSelectedLanguage('cpp')}
                  >
                    <span>C++ (.ino)</span>
                  </button>
                  <button
                    type="button"
                    className={`cf-lang-btn ${selectedLanguage === 'python' ? 'active' : ''}`}
                    onClick={() => setSelectedLanguage('python')}
                  >
                    <span>MicroPython (.py)</span>
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="cf-btn-sm"
                    onClick={handleCompile}
                    disabled={isCompiling || isUploading || blockCount === 0}
                    title="Verify / Compile code"
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Verify</span>
                  </button>
                  <button
                    className="cf-btn-sm"
                    onClick={handleUpload}
                    disabled={isCompiling || isUploading || blockCount === 0 || !selectedPort}
                    title="Compile and Upload to board"
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                    <span>Upload</span>
                  </button>
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
                    onClick={handleExportCode}
                    title={
                      selectedLanguage === 'python'
                        ? 'Download main.py script'
                        : 'Download .ino sketch file'
                    }
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
                    <span>{selectedLanguage === 'python' ? 'Export main.py' : 'Export .ino'}</span>
                  </button>
                </div>
              </div>
              <pre className="cf-code-view">
                <code>{activeCode}</code>
              </pre>
            </div>
          )}

          {/* Tab Content: Build Console & Diagnostics */}
          {activeTab === 'build' && (
            <div className="cf-tab-content cf-tab-build">
              <div className="cf-build-header">
                <div className="cf-build-meta">
                  <span className="cf-build-target">
                    {activeBoard.name} ({activeBoard.fqbn})
                  </span>
                  {buildStats && (
                    <span className="cf-build-stats">
                      Flash: {((buildStats.binarySize || 0) / 1024).toFixed(1)} KB &middot; RAM:{' '}
                      {buildStats.ramUsage || 0} B
                    </span>
                  )}
                </div>
                <div className="cf-build-actions">
                  <button
                    className="cf-btn-sm"
                    onClick={() => setCompilerLogs([])}
                    disabled={compilerLogs.length === 0}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {lastError && (
                <div className="cf-error-banner">
                  <div className="cf-error-content">
                    <div className="cf-error-title">DIAGNOSTIC ADVICE</div>
                    <div className="cf-error-text">{lastError}</div>
                  </div>
                </div>
              )}

              <div className="cf-build-logs">
                {compilerLogs.length === 0 ? (
                  <div className="cf-empty-terminal">
                    No compilation runs yet. Click &quot;Verify&quot; or &quot;Upload&quot; to
                    build.
                  </div>
                ) : (
                  compilerLogs.map((log, index) => (
                    <div key={index} className="cf-build-line">
                      <span>{log}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab Content: Device Info */}
          {activeTab === 'device' && (
            <div className="cf-tab-content cf-tab-device">
              <div className="cf-card">
                <div className="cf-info-row">
                  <span className="cf-label">Target Board</span>
                  <span className="cf-value">{activeBoard.name}</span>
                </div>
                <div className="cf-info-row">
                  <span className="cf-label">Architecture</span>
                  <span className="cf-value">{activeBoard.architecture}</span>
                </div>
                <div className="cf-info-row">
                  <span className="cf-label">FQBN</span>
                  <span className="cf-value">{activeBoard.fqbn}</span>
                </div>
                <div className="cf-info-row">
                  <span className="cf-label">Logic Voltage</span>
                  <span className="cf-value">{activeBoard.voltage}V</span>
                </div>
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

      {/* Starter Project Library Modal */}
      <StarterLibraryModal
        isOpen={isStarterModalOpen}
        onClose={() => setIsStarterModalOpen(false)}
        onSelectProject={handleSelectStarterProject}
      />

      {/* Project Status Notification Toast */}
      {projectNotification && <div className="cf-toast">{projectNotification}</div>}
    </div>
  )
}
