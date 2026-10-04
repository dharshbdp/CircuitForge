import { useState, useEffect } from 'react'
import type * as Blockly from 'blockly'
import type { CircuitExplanation, AiApiKeyStatus } from '@shared/types'

export interface CopilotPanelProps {
  boardId: string
  code: string
  workspaceRef?: React.RefObject<Blockly.WorkspaceSvg | null>
  showNotification: (msg: string) => void
}

function getWireDotColor(wireColor: string): string {
  const lower = wireColor.toLowerCase()
  if (lower.includes('red')) return '#ef4444'
  if (lower.includes('black')) return '#3f3f46'
  if (lower.includes('brown')) return '#854d0e'
  if (lower.includes('yellow')) return '#eab308'
  if (lower.includes('green')) return '#10b981'
  if (lower.includes('blue')) return '#3b82f6'
  if (lower.includes('orange')) return '#f97316'
  if (lower.includes('white')) return '#f4f4f5'
  return '#a1a1aa'
}

export function CopilotPanel({
  boardId,
  code,
  showNotification
}: CopilotPanelProps): React.JSX.Element {
  const [explanation, setExplanation] = useState<CircuitExplanation | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [apiKeyStatus, setApiKeyStatus] = useState<AiApiKeyStatus>({ isConfigured: false })
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false)
  const [inputKey, setInputKey] = useState<string>('')
  const [copiedTable, setCopiedTable] = useState<boolean>(false)

  // Fetch API key status on mount
  useEffect(() => {
    window.api
      .getAiApiKeyStatus()
      .then((status) => setApiKeyStatus(status))
      .catch((err) => console.warn('Failed to load AI key status:', err))
  }, [])

  // Execute Circuit & Wiring Explanation
  const handleExplainCircuit = async (): Promise<void> => {
    if (!code.trim()) {
      showNotification('Please add some visual blocks or code first to explain.')
      return
    }

    setIsLoading(true)
    try {
      const result = await window.api.explainCircuit({
        boardId,
        code
      })
      setExplanation(result)
      if (result.isAiGenerated) {
        showNotification('Gemini AI Circuit Explanation & Wiring Guide generated')
      } else {
        showNotification('Offline Hardware Analysis & Wiring Guide generated')
      }
    } catch (err) {
      console.error('Failed to explain circuit:', err)
      showNotification(`Analysis Failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Save API key
  const handleSaveKey = async (): Promise<void> => {
    const success = await window.api.setAiApiKey(inputKey)
    if (success) {
      const updated = await window.api.getAiApiKeyStatus()
      setApiKeyStatus(updated)
      setIsKeyModalOpen(false)
      setInputKey('')
      showNotification(
        updated.isConfigured
          ? 'Gemini API Key configured successfully'
          : 'API Key removed (using Offline Engine)'
      )
    } else {
      showNotification('Failed to save API key')
    }
  }

  // Copy Wiring Table as Markdown
  const handleCopyWiringTable = (): void => {
    if (!explanation?.wiringTable?.length) return

    const rows = [
      '| Component | Component Pin | Microcontroller Pin | Wire Color | Notes |',
      '| :--- | :--- | :--- | :--- | :--- |',
      ...explanation.wiringTable.map(
        (w) =>
          `| ${w.component} | ${w.componentPin} | ${w.boardPin} | ${w.wireColor} | ${w.notes || '-'} |`
      )
    ]

    const text = rows.join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopiedTable(true)
      showNotification('Wiring table copied to clipboard as Markdown')
      setTimeout(() => setCopiedTable(false), 2000)
    })
  }

  return (
    <div className="cf-copilot-panel">
      {/* Top Header & Controls */}
      <div className="cf-copilot-header">
        <div className="cf-copilot-header-left">
          <div className="cf-copilot-title-group">
            <span className="cf-copilot-title">AI HARDWARE COPILOT</span>
            <div className="cf-copilot-badges">
              {apiKeyStatus.isConfigured ? (
                <span className="cf-badge cf-badge-ai" title="Connected to Google Gemini AI">
                  <span className="cf-dot cf-dot-green" />
                  GEMINI AI
                </span>
              ) : (
                <span
                  className="cf-badge cf-badge-offline"
                  title="Using deterministic built-in offline hardware reasoning"
                >
                  <span className="cf-dot cf-dot-amber" />
                  OFFLINE ENGINE
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="cf-copilot-header-right">
          <button
            className="cf-btn-sm"
            onClick={() => setIsKeyModalOpen(true)}
            title="Configure Google Gemini API Key"
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
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>API Key</span>
          </button>

          <button
            className="cf-btn cf-btn-primary cf-btn-explain"
            onClick={handleExplainCircuit}
            disabled={isLoading || !code.trim()}
            title="Analyze active circuit blocks and generate breadboard wiring instructions"
          >
            {isLoading ? (
              <>
                <span className="cf-spinner" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span>Explain Circuit</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="cf-copilot-body">
        {/* Warning banner if fallback occurred */}
        {explanation?.error && (
          <div className="cf-copilot-warning-banner">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{explanation.error}</span>
          </div>
        )}

        {/* Empty State */}
        {!explanation && !isLoading && (
          <div className="cf-copilot-empty">
            <div className="cf-copilot-empty-icon">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
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
            </div>
            <h3>Context-Aware Hardware Reasoning</h3>
            <p>
              Click <strong>&quot;Explain Circuit&quot;</strong> to generate a complete breadboard
              wiring schematic, signal flow explanation, and electrical safety checks for your
              active visual blocks.
            </p>
            <div className="cf-copilot-empty-features">
              <div className="cf-feature-chip">
                <span>Breadboard Hookup Guide</span>
              </div>
              <div className="cf-feature-chip">
                <span>Color-Coded Jumper Wire Map</span>
              </div>
              <div className="cf-feature-chip">
                <span>Voltage &amp; Ground Verification</span>
              </div>
            </div>
            <button
              className="cf-btn cf-btn-primary"
              onClick={handleExplainCircuit}
              disabled={!code.trim()}
            >
              Analyze Circuit Now
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="cf-copilot-loading">
            <div className="cf-copilot-pulse-bar" />
            <p>Analyzing circuit logic &amp; synthesizing breadboard wiring table...</p>
          </div>
        )}

        {/* Explanation Results */}
        {explanation && !isLoading && (
          <div className="cf-copilot-results">
            {/* 1. Summary Card */}
            <div className="cf-copilot-card">
              <div className="cf-card-header">
                <span className="cf-card-title">FIRMWARE OVERVIEW</span>
              </div>
              <p className="cf-card-content">{explanation.summary}</p>
            </div>

            {/* 2. Logic Flow */}
            {explanation.logicFlow && explanation.logicFlow.length > 0 && (
              <div className="cf-copilot-card">
                <div className="cf-card-header">
                  <span className="cf-card-title">RUNTIME LOGIC FLOW</span>
                </div>
                <ol className="cf-logic-flow-list">
                  {explanation.logicFlow.map((step, idx) => (
                    <li key={idx} className="cf-logic-flow-item">
                      <span className="cf-step-number">{idx + 1}</span>
                      <span className="cf-step-text">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* 3. Breadboard Wiring Table */}
            {explanation.wiringTable && explanation.wiringTable.length > 0 && (
              <div className="cf-copilot-card">
                <div className="cf-card-header cf-card-header-table">
                  <span className="cf-card-title">BREADBOARD WIRING GUIDE</span>
                  <button
                    className="cf-btn-sm cf-btn-copy-table"
                    onClick={handleCopyWiringTable}
                    title="Copy table to clipboard as Markdown"
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>{copiedTable ? 'Copied!' : 'Copy Table'}</span>
                  </button>
                </div>

                <div className="cf-table-wrapper">
                  <table className="cf-wiring-table">
                    <thead>
                      <tr>
                        <th>COMPONENT</th>
                        <th>PIN</th>
                        <th>BOARD PIN</th>
                        <th>WIRE</th>
                        <th>NOTES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {explanation.wiringTable.map((w, idx) => (
                        <tr key={idx}>
                          <td className="cf-td-component">{w.component}</td>
                          <td className="cf-td-pin">{w.componentPin}</td>
                          <td className="cf-td-board-pin">
                            <code>{w.boardPin}</code>
                          </td>
                          <td className="cf-td-wire">
                            <span
                              className="cf-wire-dot"
                              style={{ backgroundColor: getWireDotColor(w.wireColor) }}
                              title={w.wireColor}
                            />
                            <span>{w.wireColor}</span>
                          </td>
                          <td className="cf-td-notes">{w.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. Power & Safety Diagnostics */}
            {explanation.powerNotes && explanation.powerNotes.length > 0 && (
              <div className="cf-copilot-card cf-safety-card">
                <div className="cf-card-header">
                  <span className="cf-card-title">ELECTRICAL &amp; POWER ADVISORIES</span>
                </div>
                <ul className="cf-safety-list">
                  {explanation.powerNotes.map((note, idx) => (
                    <li key={idx} className="cf-safety-item">
                      <span className="cf-safety-icon">&bull;</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* API Key Configuration Modal */}
      {isKeyModalOpen && (
        <div
          className="cf-modal-backdrop"
          onClick={() => setIsKeyModalOpen(false)}
          role="presentation"
        >
          <div
            className="cf-modal-container cf-modal-apikey"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="cf-modal-header">
              <div className="cf-modal-title-group">
                <h3 className="cf-modal-title">GEMINI AI SETTINGS</h3>
                <p className="cf-modal-subtitle">
                  Configure your Google Gemini API Key for deep conversational circuit reasoning
                </p>
              </div>
              <button
                className="cf-modal-close-btn"
                onClick={() => setIsKeyModalOpen(false)}
                title="Close"
              >
                &times;
              </button>
            </div>

            <div className="cf-modal-body">
              <div className="cf-apikey-status-banner">
                <span className="cf-label">CURRENT STATUS:</span>
                {apiKeyStatus.isConfigured ? (
                  <span className="cf-status-active">
                    Configured ({apiKeyStatus.maskedKey || 'Active'})
                  </span>
                ) : (
                  <span className="cf-status-offline">
                    No Key Configured (Using Deterministic Offline Engine)
                  </span>
                )}
              </div>

              <div className="cf-form-group">
                <label htmlFor="cf-gemini-key-input">Gemini API Key</label>
                <input
                  id="cf-gemini-key-input"
                  type="password"
                  className="cf-input"
                  placeholder="AIzaSy..."
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                />
                <span className="cf-input-hint">
                  Free API keys are available at{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="cf-link"
                  >
                    Google AI Studio
                  </a>
                  . Your key is stored locally on this machine.
                </span>
              </div>
            </div>

            <div className="cf-modal-footer">
              <button
                className="cf-btn-sm"
                onClick={async () => {
                  await window.api.setAiApiKey('')
                  const updated = await window.api.getAiApiKeyStatus()
                  setApiKeyStatus(updated)
                  setIsKeyModalOpen(false)
                  setInputKey('')
                  showNotification('API Key cleared. Using Offline Engine.')
                }}
                disabled={!apiKeyStatus.isConfigured}
              >
                Clear Key
              </button>
              <div className="cf-footer-right">
                <button className="cf-btn-sm" onClick={() => setIsKeyModalOpen(false)}>
                  Cancel
                </button>
                <button
                  className="cf-btn cf-btn-primary"
                  onClick={handleSaveKey}
                  disabled={!inputKey.trim()}
                >
                  Save API Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
