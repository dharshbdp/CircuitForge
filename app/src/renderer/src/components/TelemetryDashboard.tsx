import { useState, useRef, useEffect, useMemo } from 'react'
import type { TelemetryDataPoint } from '../utils/telemetryParser'

export interface TelemetryDashboardProps {
  history: TelemetryDataPoint[]
  channels: string[]
  isRecording: boolean
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>
  clearTelemetry: () => void
  exportCSV: () => void
  exportJSON: () => void
  isConnected: boolean
}

// Curated high-contrast technical channel colors
const CHANNEL_COLORS = [
  '#f4f4f6', // Light gray / white
  '#60a5fa', // Blue
  '#34d399', // Emerald
  '#fbbf24', // Amber
  '#f87171', // Coral red
  '#a78bfa', // Purple
  '#38bdf8', // Sky blue
  '#fb923c' // Orange
]

export function TelemetryDashboard({
  history,
  channels,
  isRecording,
  setIsRecording,
  clearTelemetry,
  exportCSV,
  exportJSON,
  isConnected
}: TelemetryDashboardProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [selectedChannels, setSelectedChannels] = useState<Record<string, boolean>>({})

  // Toggle channel visibility on graph
  const toggleChannel = (channel: string): void => {
    setSelectedChannels((prev) => ({
      ...prev,
      [channel]: prev[channel] === false ? true : false
    }))
  }

  // Calculate statistics per channel
  const stats = useMemo(() => {
    const result: Record<string, { latest: number; min: number; max: number; avg: number }> = {}

    for (const ch of channels) {
      const values: number[] = []
      for (const pt of history) {
        if (pt.values[ch] !== undefined) {
          values.push(pt.values[ch])
        }
      }

      if (values.length > 0) {
        const latest = values[values.length - 1]
        const min = Math.min(...values)
        const max = Math.max(...values)
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length
        result[ch] = { latest, min, max, avg }
      }
    }

    return result
  }, [history, channels])

  // Canvas Oscilloscope Rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas dimensions based on display resolution (retina crisp)
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height

    // Background fill
    ctx.fillStyle = '#0a0a0c'
    ctx.fillRect(0, 0, width, height)

    // Draw grid lines
    ctx.strokeStyle = '#1a1a1e'
    ctx.lineWidth = 1

    const numYDivisions = 5
    for (let i = 0; i <= numYDivisions; i++) {
      const y = (height / numYDivisions) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    const numXDivisions = 8
    for (let i = 0; i <= numXDivisions; i++) {
      const x = (width / numXDivisions) * i
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    if (history.length < 2 || channels.length === 0) {
      // Draw centered empty text if no data
      ctx.fillStyle = '#52525b'
      ctx.font = '12px "Consolas", monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Waiting for incoming numerical sensor data...', width / 2, height / 2)
      return
    }

    // Determine global min and max across visible channels
    let globalMin = Infinity
    let globalMax = -Infinity

    for (const ch of channels) {
      if (selectedChannels[ch] === false) continue
      const st = stats[ch]
      if (st) {
        if (st.min < globalMin) globalMin = st.min
        if (st.max > globalMax) globalMax = st.max
      }
    }

    if (globalMin === Infinity || globalMax === -Infinity) {
      globalMin = 0
      globalMax = 100
    }

    // Add 10% padding to Y range so lines don't hit edge
    const range = globalMax - globalMin || 1
    const padding = range * 0.1
    const plotMin = globalMin - padding
    const plotMax = globalMax + padding
    const plotRange = plotMax - plotMin

    // Draw Y-Axis Labels
    ctx.fillStyle = '#71717a'
    ctx.font = '10px "Consolas", monospace'
    ctx.textAlign = 'left'
    ctx.fillText(plotMax.toFixed(1), 8, 14)
    ctx.fillText(((plotMax + plotMin) / 2).toFixed(1), 8, height / 2 + 3)
    ctx.fillText(plotMin.toFixed(1), 8, height - 6)

    // Plot lines for each channel
    channels.forEach((ch, chIdx) => {
      if (selectedChannels[ch] === false) return

      const color = CHANNEL_COLORS[chIdx % CHANNEL_COLORS.length]
      ctx.strokeStyle = color
      ctx.lineWidth = 1.8
      ctx.beginPath()

      let started = false
      const totalPoints = history.length

      history.forEach((pt, ptIdx) => {
        const val = pt.values[ch]
        if (val === undefined) return

        const x = (ptIdx / (totalPoints - 1)) * width
        const normalizedY = (val - plotMin) / plotRange
        const y = height - normalizedY * height

        if (!started) {
          ctx.moveTo(x, y)
          started = true
        } else {
          ctx.lineTo(x, y)
        }
      })

      ctx.stroke()
    })
  }, [history, channels, selectedChannels, stats])

  return (
    <div className="cf-telemetry-dashboard">
      {/* Top Controls Toolbar */}
      <div className="cf-telemetry-toolbar">
        <div className="cf-telemetry-toolbar-left">
          <span className="cf-telemetry-title">LIVE OSCILLOSCOPE</span>
          <span className="cf-telemetry-badge">
            {channels.length} {channels.length === 1 ? 'CHANNEL' : 'CHANNELS'} &middot;{' '}
            {history.length} SAMPLES
          </span>
          {isRecording && (
            <span className="cf-recording-indicator" title="Actively capturing telemetry stream">
              <span className="cf-recording-dot" />
              LIVE
            </span>
          )}
        </div>

        <div className="cf-telemetry-toolbar-right">
          <button
            className={`cf-btn-sm ${isRecording ? 'cf-btn-pause' : 'cf-btn-record'}`}
            onClick={() => setIsRecording((prev) => !prev)}
            title={isRecording ? 'Pause stream capture' : 'Resume stream capture'}
          >
            {isRecording ? 'Pause' : 'Resume'}
          </button>

          <button
            className="cf-btn-sm"
            onClick={clearTelemetry}
            disabled={history.length === 0}
            title="Clear buffer and reset channels"
          >
            Clear
          </button>

          <button
            className="cf-btn-sm"
            onClick={exportCSV}
            disabled={history.length === 0}
            title="Download captured data as CSV file"
          >
            Export CSV
          </button>

          <button
            className="cf-btn-sm"
            onClick={exportJSON}
            disabled={history.length === 0}
            title="Download captured data as JSON file"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Main Visual: Oscilloscope Canvas */}
      <div className="cf-oscilloscope-container">
        <canvas ref={canvasRef} className="cf-oscilloscope-canvas" />

        {/* Legend / Filter Chips */}
        {channels.length > 0 && (
          <div className="cf-telemetry-legend">
            {channels.map((ch, idx) => {
              const color = CHANNEL_COLORS[idx % CHANNEL_COLORS.length]
              const isVisible = selectedChannels[ch] !== false
              const currentVal = stats[ch]?.latest ?? '--'

              return (
                <button
                  key={ch}
                  className={`cf-legend-chip ${isVisible ? 'active' : 'inactive'}`}
                  onClick={() => toggleChannel(ch)}
                  title={`Click to ${isVisible ? 'hide' : 'show'} ${ch} on graph`}
                >
                  <span className="cf-legend-color" style={{ backgroundColor: color }} />
                  <span className="cf-legend-label">{ch}</span>
                  <span className="cf-legend-val">{currentVal}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Sensor Metric Cards */}
      <div className="cf-telemetry-cards">
        {channels.length === 0 ? (
          <div className="cf-telemetry-empty-hint">
            <div className="cf-hint-title">Awaiting Telemetry Stream</div>
            <p className="cf-hint-desc">
              Connect a microcontroller and output data via serial. CircuitForge automatically
              detects:
            </p>
            <div className="cf-hint-code-grid">
              <div className="cf-hint-item">
                <span className="cf-hint-tag">KEY-VALUE</span>
                <code>Serial.println(&quot;temp:24.5, hum:60&quot;);</code>
              </div>
              <div className="cf-hint-item">
                <span className="cf-hint-tag">JSON</span>
                <code>Serial.println(&quot;&#123;\&quot;distance\&quot;:14.2&#125;&quot;);</code>
              </div>
              <div className="cf-hint-item">
                <span className="cf-hint-tag">PLOTTER</span>
                <code>Serial.println(&quot;1023, 512, 256&quot;);</code>
              </div>
            </div>
            {!isConnected && (
              <div className="cf-hint-status">Serial port is currently disconnected.</div>
            )}
          </div>
        ) : (
          channels.map((ch, idx) => {
            const color = CHANNEL_COLORS[idx % CHANNEL_COLORS.length]
            const st = stats[ch]
            if (!st) return null

            return (
              <div key={ch} className="cf-metric-card" style={{ borderTopColor: color }}>
                <div className="cf-metric-header">
                  <span className="cf-metric-name">{ch}</span>
                  <span className="cf-metric-color-bar" style={{ backgroundColor: color }} />
                </div>
                <div className="cf-metric-current">{st.latest.toFixed(2)}</div>
                <div className="cf-metric-substats">
                  <div className="cf-substat">
                    <span className="cf-substat-label">MIN</span>
                    <span className="cf-substat-value">{st.min.toFixed(1)}</span>
                  </div>
                  <div className="cf-substat">
                    <span className="cf-substat-label">AVG</span>
                    <span className="cf-substat-value">{st.avg.toFixed(1)}</span>
                  </div>
                  <div className="cf-substat">
                    <span className="cf-substat-label">MAX</span>
                    <span className="cf-substat-value">{st.max.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
