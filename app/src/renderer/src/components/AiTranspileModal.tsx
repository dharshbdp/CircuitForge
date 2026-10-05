import { useState, useEffect } from 'react'
import type { AiTranspileResult, AiApiKeyStatus } from '../../../shared/types'
import { getBoardById } from '../../../hardware'

export interface AiTranspileModalProps {
  isOpen: boolean
  onClose: () => void
  boardId: string
  initialCode?: string
  onApplyBlocks: (result: AiTranspileResult, mode: 'replace' | 'append') => void
}

const PRESET_SKETCHES = [
  {
    label: 'Ultrasonic Radar & Servo Scanner',
    description:
      'Sweeps servo 0-180°, measures distance with HC-SR04, prints telemetry and triggers alarm.',
    code: `#include <Servo.h>

Servo radarServo;
const int trigPin = 12;
const int echoPin = 11;
const int buzzerPin = 8;
const int ledPin = 13;

long readDistance() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH);
  return duration * 0.034 / 2;
}

void setup() {
  Serial.begin(9600);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(buzzerPin, OUTPUT);
  pinMode(ledPin, OUTPUT);
  radarServo.attach(9);
  Serial.println("Radar Scanner Initialized");
}

void loop() {
  for (int pos = 0; pos <= 180; pos += 45) {
    radarServo.write(pos);
    delay(100);
    long dist = readDistance();
    Serial.print("Angle: ");
    Serial.print(pos);
    Serial.print(" Distance: ");
    Serial.println(dist);

    if (dist < 15 && dist > 0) {
      digitalWrite(buzzerPin, HIGH);
      digitalWrite(ledPin, HIGH);
      delay(150);
      digitalWrite(buzzerPin, LOW);
      digitalWrite(ledPin, LOW);
    }
  }
}`
  },
  {
    label: 'DHT11 Climate Station & Relay Fan',
    description:
      'Reads DHT11 temperature/humidity, streams serial data, and engages cooling relay.',
    code: `#include <DHT.h>
#define DHTPIN 2
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);
const int fanRelayPin = 7;
const int warnLedPin = 13;

void setup() {
  Serial.begin(9600);
  dht.begin();
  pinMode(fanRelayPin, OUTPUT);
  pinMode(warnLedPin, OUTPUT);
  digitalWrite(fanRelayPin, LOW);
}

void loop() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  Serial.print("Temp: ");
  Serial.print(t);
  Serial.print("C | Humidity: ");
  Serial.print(h);
  Serial.println("%");

  if (t > 28.0) {
    digitalWrite(fanRelayPin, HIGH);
    digitalWrite(warnLedPin, HIGH);
  } else {
    digitalWrite(fanRelayPin, LOW);
    digitalWrite(warnLedPin, LOW);
  }
  delay(2000);
}`
  },
  {
    label: 'LDR Night Light with Multi-Level PWM',
    description: 'Monitors ambient light on A0 and adjusts PWM brightness on Pin 9.',
    code: `const int ldrPin = A0;
const int ledPwmPin = 9;

void setup() {
  Serial.begin(115200);
  pinMode(ledPwmPin, OUTPUT);
}

void loop() {
  int lightVal = analogRead(ldrPin);
  Serial.print("Light Level: ");
  Serial.println(lightVal);

  if (lightVal < 300) {
    analogWrite(ledPwmPin, 255);
  } else if (lightVal < 600) {
    analogWrite(ledPwmPin, 128);
  } else {
    analogWrite(ledPwmPin, 0);
  }
  delay(500);
}`
  },
  {
    label: 'WS2812B NeoPixel RGB Cycle',
    description: 'Initializes addressable LED strip on pin 6 and shifts RGB color patterns.',
    code: `#include <Adafruit_NeoPixel.h>
#define PIN 6
#define NUMPIXELS 8

Adafruit_NeoPixel pixels(NUMPIXELS, PIN, NEO_GRB + NEO_KHZ800);

void setup() {
  pixels.begin();
  pixels.clear();
}

void loop() {
  for(int i = 0; i < NUMPIXELS; i++) {
    pixels.setPixelColor(i, pixels.Color(255, 0, 0));
    pixels.show();
    delay(100);
  }
  delay(500);
  pixels.clear();
  pixels.show();
  delay(500);
}`
  }
]

export default function AiTranspileModal({
  isOpen,
  onClose,
  boardId,
  initialCode = '',
  onApplyBlocks
}: AiTranspileModalProps): React.JSX.Element | null {
  const [sketchCode, setSketchCode] = useState(
    initialCode && initialCode.trim().length > 0 ? initialCode : PRESET_SKETCHES[0].code
  )
  const [mode, setMode] = useState<'replace' | 'append'>('replace')
  const [isTranspiling, setIsTranspiling] = useState(false)
  const [result, setResult] = useState<AiTranspileResult | null>(null)
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
      if (e.key === 'Escape' && isOpen && !isTranspiling) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isTranspiling, onClose])

  if (!isOpen) return null

  const handleTranspile = async (): Promise<void> => {
    if (!sketchCode.trim()) return

    setIsTranspiling(true)
    setError(null)

    try {
      const res = await window.api.transpileSketch({
        code: sketchCode.trim(),
        boardId
      })

      if (res.success && res.blocks && res.blocks.length > 0) {
        setResult(res)
      } else {
        setError(res.error || 'Transpilation returned no valid blocks for this sketch.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsTranspiling(false)
    }
  }

  const handleApply = (): void => {
    if (!result) return
    onApplyBlocks(result, mode)
    onClose()
  }

  const handleLoadPreset = (code: string): void => {
    setSketchCode(code)
    setResult(null)
    setError(null)
  }

  // Calculate stats
  const totalBlocks = result?.blocks?.length || 0
  const rawSnippets = result?.unmappedSnippetsCount || 0
  const nativeBlocks = Math.max(0, totalBlocks - rawSnippets)
  const conversionPercent = totalBlocks > 0 ? Math.round((nativeBlocks / totalBlocks) * 100) : 0

  return (
    <div className="cf-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="cf-modal-container cf-modal-transpiler"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cf-transpile-modal-title"
      >
        {/* Modal Header */}
        <div className="cf-modal-header">
          <div className="cf-modal-title-group">
            <div className="cf-copilot-badge-row">
              <span className="cf-copilot-badge">AI TRANSPILER</span>
              <span className="cf-copilot-subbadge">v0.7 Full C++ to Blocks</span>
              {apiKeyStatus?.isConfigured ? (
                <span
                  className="cf-ai-online-badge"
                  title={`Gemini API Active (${apiKeyStatus.maskedKey})`}
                >
                  GEMINI 2.5 FLASH
                </span>
              ) : (
                <span
                  className="cf-ai-offline-badge"
                  title="No Gemini API Key; using deterministic AST reverse compiler"
                >
                  OFFLINE REVERSE COMPILER
                </span>
              )}
            </div>
            <h2 id="cf-transpile-modal-title" className="cf-modal-title">
              Translate External Arduino Sketch to Visual Blocks
            </h2>
            <p className="cf-modal-subtitle">
              Paste arbitrary, multi-function Arduino C++ code with custom libraries to
              automatically synthesize clean, organized visual Blockly blocks for{' '}
              <strong>{boardName}</strong>.
            </p>
          </div>
          <button className="cf-modal-close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Preset Sketches Selector */}
        <div className="cf-transpile-presets-row">
          <span className="cf-transpile-presets-label">Load Example Sketch:</span>
          <div className="cf-transpile-presets-pills">
            {PRESET_SKETCHES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                className="cf-preset-chip"
                onClick={() => handleLoadPreset(preset.code)}
                title={preset.description}
                disabled={isTranspiling}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body: Side-by-Side Split View */}
        <div className="cf-modal-body cf-transpile-split-body">
          {/* Left Column: C++ Source Code Input */}
          <div className="cf-transpile-pane cf-transpile-code-pane">
            <div className="cf-pane-header">
              <span className="cf-pane-title">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                Arduino C++ Sketch
              </span>
              <div className="cf-pane-meta">
                <span>{sketchCode.split('\n').length} lines</span>
                <span>{sketchCode.length} chars</span>
              </div>
            </div>
            <div className="cf-transpile-editor-wrapper">
              <textarea
                className="cf-transpile-textarea"
                value={sketchCode}
                onChange={(e) => {
                  setSketchCode(e.target.value)
                  if (result) setResult(null)
                }}
                placeholder="// Paste full Arduino C++ code here...&#10;void setup() { ... }&#10;void loop() { ... }"
                disabled={isTranspiling}
                rows={16}
                spellCheck={false}
              />
            </div>
            <div className="cf-transpile-actions-bar">
              <button
                type="button"
                className="cf-btn cf-btn-transpile"
                onClick={handleTranspile}
                disabled={isTranspiling || !sketchCode.trim()}
              >
                {isTranspiling ? (
                  <>
                    <span className="cf-spinner"></span>
                    Transpiling Sketch...
                  </>
                ) : (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    Transpile to Blocks
                  </>
                )}
              </button>
              <button
                type="button"
                className="cf-btn cf-btn-secondary"
                onClick={() => setSketchCode('')}
                disabled={isTranspiling || !sketchCode}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Right Column: Generated Blocks Review & Diff */}
          <div className="cf-transpile-pane cf-transpile-review-pane">
            <div className="cf-pane-header">
              <span className="cf-pane-title">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                Generated Visual Blocks Preview
              </span>
              {result && (
                <div className="cf-pane-meta">
                  <span
                    className={`cf-badge ${result.source === 'gemini' ? 'cf-badge-ai' : 'cf-badge-offline'}`}
                  >
                    {result.source === 'gemini' ? 'Gemini AI' : 'Deterministic AST'}
                  </span>
                </div>
              )}
            </div>

            <div className="cf-transpile-review-content">
              {error && (
                <div className="cf-error-box">
                  <div className="cf-error-box-title">Transpilation Error</div>
                  <div className="cf-error-box-msg">{error}</div>
                </div>
              )}

              {isTranspiling && (
                <div className="cf-transpile-loading-state">
                  <div className="cf-transpile-pulse-icon">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                  <div className="cf-transpile-loading-title">Deconstructing C++ Sketch...</div>
                  <div className="cf-transpile-loading-subtitle">
                    Analyzing setup declarations, pin mappings, peripherals, and control flow for{' '}
                    {boardName}.
                  </div>
                </div>
              )}

              {!isTranspiling && !result && !error && (
                <div className="cf-transpile-empty-state">
                  <div className="cf-empty-icon">
                    <svg
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  <h4>Ready to Transpile</h4>
                  <p>
                    Paste any Arduino C++ sketch on the left or select an example above, then click{' '}
                    <strong>Transpile to Blocks</strong>.
                  </p>
                  <ul className="cf-empty-features-list">
                    <li>
                      ✓ Automatically synthesizes visual blocks for sensors, servos, NeoPixels, and
                      displays
                    </li>
                    <li>✓ Maps setup and loop routines to canvas execution order</li>
                    <li>✓ Preserves unmapped or vendor C++ code in zero-loss fallback blocks</li>
                  </ul>
                </div>
              )}

              {!isTranspiling && result && (
                <div className="cf-transpile-result-panel">
                  {/* Fidelity & Stats Card */}
                  <div className="cf-fidelity-card">
                    <div className="cf-fidelity-score-row">
                      <div className="cf-fidelity-metric">
                        <span className="cf-fidelity-val">{conversionPercent}%</span>
                        <span className="cf-fidelity-lbl">Visual Block Fidelity</span>
                      </div>
                      <div className="cf-fidelity-metric">
                        <span className="cf-fidelity-val">{totalBlocks}</span>
                        <span className="cf-fidelity-lbl">Total Blocks</span>
                      </div>
                      <div className="cf-fidelity-metric">
                        <span className="cf-fidelity-val">{nativeBlocks}</span>
                        <span className="cf-fidelity-lbl">Native Blocks</span>
                      </div>
                      {rawSnippets > 0 && (
                        <div className="cf-fidelity-metric cf-metric-warning">
                          <span className="cf-fidelity-val">{rawSnippets}</span>
                          <span className="cf-fidelity-lbl">Raw Snippets</span>
                        </div>
                      )}
                      {result.detectedBaudRate && (
                        <div className="cf-fidelity-metric">
                          <span className="cf-fidelity-val">{result.detectedBaudRate}</span>
                          <span className="cf-fidelity-lbl">Baud Rate</span>
                        </div>
                      )}
                    </div>
                    {/* Fidelity Progress Bar */}
                    <div className="cf-fidelity-bar-wrapper">
                      <div
                        className="cf-fidelity-bar-fill"
                        style={{ width: `${conversionPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Recognized Peripherals */}
                  {result.mappedComponents && result.mappedComponents.length > 0 && (
                    <div className="cf-transpile-components-section">
                      <div className="cf-section-label">Identified Hardware Components:</div>
                      <div className="cf-component-chips-wrap">
                        {result.mappedComponents.map((comp, i) => (
                          <span key={i} className="cf-component-chip">
                            <span className="cf-chip-dot"></span>
                            {comp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Architecture & Mapping Explanation */}
                  <div className="cf-transpile-explanation-box">
                    <div className="cf-section-label">Transpiler Architecture Summary:</div>
                    <p className="cf-explanation-text">{result.explanation}</p>
                  </div>

                  {/* Warnings Notice (if any) */}
                  {result.warnings && result.warnings.length > 0 && (
                    <div className="cf-transpile-warnings">
                      {result.warnings.map((w, idx) => (
                        <div key={idx} className="cf-warning-item">
                          ⚠️ {w}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="cf-modal-footer">
          <div className="cf-mode-selector">
            <span className="cf-mode-label">Target Canvas Placement:</span>
            <label className="cf-radio-label">
              <input
                type="radio"
                name="applyMode"
                value="replace"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
              />
              <span>Replace Active Canvas</span>
            </label>
            <label className="cf-radio-label">
              <input
                type="radio"
                name="applyMode"
                value="append"
                checked={mode === 'append'}
                onChange={() => setMode('append')}
              />
              <span>Append Below Existing</span>
            </label>
          </div>

          <div className="cf-footer-btn-group">
            <button type="button" className="cf-btn cf-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="cf-btn cf-btn-primary cf-btn-apply"
              onClick={handleApply}
              disabled={!result || isTranspiling}
            >
              Apply to Workspace ({totalBlocks} Blocks)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
