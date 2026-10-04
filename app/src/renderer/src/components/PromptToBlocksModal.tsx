import { useState, useEffect } from 'react'
import type { BlockSynthesisResult, AiApiKeyStatus } from '../../../shared/types'
import { getBoardById } from '../../../hardware'

export interface PromptToBlocksModalProps {
  isOpen: boolean
  onClose: () => void
  boardId: string
  onApplyBlocks: (result: BlockSynthesisResult, mode: 'replace' | 'append') => void
}

const PRESET_PROMPTS = [
  {
    label: 'Ultrasonic Proximity Alert',
    prompt:
      'When the ultrasonic sensor detects an object closer than 10cm, sound the buzzer on pin 8 and flash the red LED on pin 13.'
  },
  {
    label: 'Blink & Fade Combo',
    prompt: 'Blink digital LED on pin 13 every 500ms and oscillate PWM brightness on pin 9.'
  },
  {
    label: 'DHT11 Weather Telemetry',
    prompt:
      'Read DHT11 temperature and humidity on pin 2 and print readings to serial monitor every 2 seconds.'
  },
  {
    label: 'PIR Motion Trigger',
    prompt:
      'When motion is detected by the PIR sensor on pin 4, activate the relay switch on pin 7 for 3 seconds.'
  },
  {
    label: 'LDR Automatic Night Light',
    prompt:
      'Read analog light level from LDR sensor on A0, and if reading drops below 300, turn on night light LED on pin 9.'
  },
  {
    label: 'MQ-2 Gas Alarm',
    prompt:
      'Monitor MQ-2 gas sensor on A0. If gas concentration exceeds 400, trigger warning buzzer on pin 8.'
  },
  {
    label: 'Servo Motor Sweep',
    prompt:
      'Rotate servo motor on pin 9 between 0, 90, and 180 degrees with a 1-second delay at each step.'
  },
  {
    label: 'NeoPixel RGB Cycle',
    prompt:
      'Initialize NeoPixel strip on pin 6 with 8 LEDs and cycle through red, green, and blue colors.'
  }
]

export default function PromptToBlocksModal({
  isOpen,
  onClose,
  boardId,
  onApplyBlocks
}: PromptToBlocksModalProps): React.JSX.Element | null {
  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState<'replace' | 'append'>('replace')
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [result, setResult] = useState<BlockSynthesisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [apiKeyStatus, setApiKeyStatus] = useState<AiApiKeyStatus | null>(null)

  const board = getBoardById(boardId)
  const boardName = board?.name || 'Microcontroller'

  // Fetch API key status on open
  useEffect(() => {
    if (isOpen) {
      window.api.getAiApiKeyStatus().then(setApiKeyStatus).catch(console.error)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && isOpen && !isSynthesizing) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSynthesizing, onClose])

  if (!isOpen) return null

  const handleSynthesize = async (): Promise<void> => {
    if (!prompt.trim()) return

    setIsSynthesizing(true)
    setError(null)

    try {
      const res = await window.api.synthesizeBlocks({
        prompt: prompt.trim(),
        boardId,
        mode
      })

      if (res.success && res.blocks && res.blocks.length > 0) {
        setResult(res)
      } else {
        setError(res.error || 'Synthesis returned no valid visual blocks for this prompt.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSynthesizing(false)
    }
  }

  const handleApply = (): void => {
    if (!result) return
    onApplyBlocks(result, mode)
    onClose()
  }

  const handleSelectPreset = (p: string): void => {
    setPrompt(p)
    setResult(null)
    setError(null)
  }

  return (
    <div className="cf-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="cf-modal-container cf-modal-prompt-blocks"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cf-prompt-modal-title"
      >
        {/* Modal Header */}
        <div className="cf-modal-header">
          <div className="cf-modal-title-group">
            <div className="cf-copilot-badge-row">
              <span className="cf-copilot-badge">AI SYNTHESIZER</span>
              <span className="cf-copilot-model-tag">
                {apiKeyStatus?.isConfigured ? 'GEMINI 2.5 FLASH' : 'OFFLINE ENGINE'}
              </span>
              <span className="cf-copilot-board-tag">{boardName}</span>
            </div>
            <h2 id="cf-prompt-modal-title" className="cf-modal-title">
              PROMPT-TO-BLOCKS SYNTHESIS
            </h2>
            <p className="cf-modal-subtitle">
              Describe embedded circuit logic in plain English to automatically construct connected
              visual blocks and working C++ firmware.
            </p>
          </div>
          <button
            className="cf-modal-close-btn"
            onClick={onClose}
            disabled={isSynthesizing}
            title="Close modal (Esc)"
            aria-label="Close modal"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="cf-modal-body cf-prompt-modal-body">
          {/* Quick Preset Pills */}
          <div className="cf-prompt-presets-section">
            <span className="cf-prompt-presets-label">QUICK TEMPLATES:</span>
            <div className="cf-prompt-presets-list">
              {PRESET_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="cf-prompt-pill"
                  onClick={() => handleSelectPreset(p.prompt)}
                  disabled={isSynthesizing}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input Area */}
          <div className="cf-prompt-input-wrapper">
            <label htmlFor="cf-synthesis-textarea" className="cf-prompt-label">
              NATURAL LANGUAGE INSTRUCTION
            </label>
            <textarea
              id="cf-synthesis-textarea"
              className="cf-prompt-textarea"
              rows={4}
              placeholder="e.g., When the ultrasonic sensor detects an obstacle closer than 15cm, sound buzzer on pin 8 and flash red LED on pin 13..."
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value)
                setResult(null)
                setError(null)
              }}
              disabled={isSynthesizing}
              autoFocus
            />
            <div className="cf-prompt-footer-row">
              <span className="cf-prompt-char-count">{prompt.length} characters</span>
              <div className="cf-prompt-mode-selector">
                <span className="cf-prompt-mode-label">CANVAS PLACEMENT:</span>
                <label className="cf-prompt-radio-item">
                  <input
                    type="radio"
                    name="cf-placement-mode"
                    value="replace"
                    checked={mode === 'replace'}
                    onChange={() => setMode('replace')}
                    disabled={isSynthesizing}
                  />
                  <span>Replace Workspace</span>
                </label>
                <label className="cf-prompt-radio-item">
                  <input
                    type="radio"
                    name="cf-placement-mode"
                    value="append"
                    checked={mode === 'append'}
                    onChange={() => setMode('append')}
                    disabled={isSynthesizing}
                  />
                  <span>Append to Canvas</span>
                </label>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="cf-copilot-error-banner" style={{ marginTop: '12px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Synthesis Review / Preview */}
          {result && (
            <div className="cf-synthesis-preview-card">
              <div className="cf-synthesis-preview-header">
                <div className="cf-synthesis-status-badge">
                  <span className="cf-dot-indicator cf-dot-active" />
                  <span>SYNTHESIS COMPLETE ({result.blocks.length} BLOCKS GENERATED)</span>
                </div>
                <span className="cf-synthesis-source-tag">
                  {result.source === 'gemini' ? 'CLOUD GEMINI 2.5' : 'OFFLINE DETERMINISTIC'}
                </span>
              </div>

              {/* Natural Language Explanation */}
              <div className="cf-synthesis-explanation">
                <p>{result.explanation}</p>
              </div>

              {/* C++ Firmware Code Preview */}
              {result.cppCode && (
                <div className="cf-synthesis-code-preview">
                  <div className="cf-synthesis-code-header">
                    <span>CORRESPONDING ARDUINO C++ FIRMWARE</span>
                  </div>
                  <pre className="cf-synthesis-code-block">
                    <code>{result.cppCode}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="cf-modal-actions cf-prompt-modal-actions">
          <div className="cf-modal-left-note">
            {apiKeyStatus?.isConfigured ? (
              <span className="cf-status-text cf-status-online">
                Cloud AI ready with Gemini API key
              </span>
            ) : (
              <span className="cf-status-text cf-status-offline">
                Operating in 100% deterministic offline mode
              </span>
            )}
          </div>
          <div className="cf-modal-buttons-group">
            <button
              type="button"
              className="cf-btn cf-btn-secondary"
              onClick={onClose}
              disabled={isSynthesizing}
            >
              Cancel
            </button>

            {!result ? (
              <button
                type="button"
                className="cf-btn cf-btn-primary"
                onClick={handleSynthesize}
                disabled={isSynthesizing || !prompt.trim()}
              >
                {isSynthesizing ? (
                  <>
                    <span className="cf-copilot-spinner" />
                    <span>Synthesizing...</span>
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
                    >
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    <span>Synthesize Blocks</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                className="cf-btn cf-btn-primary cf-btn-apply"
                onClick={handleApply}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Apply to Canvas ({mode === 'replace' ? 'Replace' : 'Append'})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
