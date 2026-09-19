import { useState, useEffect, useRef, useCallback } from 'react'
import { parseTelemetryLine, type TelemetryDataPoint } from '../utils/telemetryParser'

const DEFAULT_MAX_HISTORY = 300

export interface UseTelemetryReturn {
  history: TelemetryDataPoint[]
  channels: string[]
  isRecording: boolean
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>
  clearTelemetry: () => void
  exportCSV: () => void
  exportJSON: () => void
}

export function useTelemetry(maxHistory: number = DEFAULT_MAX_HISTORY): UseTelemetryReturn {
  const [history, setHistory] = useState<TelemetryDataPoint[]>([])
  const [channels, setChannels] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState<boolean>(true)

  const isRecordingRef = useRef<boolean>(isRecording)

  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  const historyRef = useRef<TelemetryDataPoint[]>([])
  const channelsRef = useRef<Set<string>>(new Set())
  const lineBufferRef = useRef<string>('')

  useEffect(() => {
    if (!window.api?.onSerialData) return

    const unsub = window.api.onSerialData((chunk: string) => {
      if (!isRecordingRef.current) return

      lineBufferRef.current += chunk
      const lines = lineBufferRef.current.split(/\r?\n/)
      // Keep the last incomplete fragment in buffer
      lineBufferRef.current = lines.pop() || ''

      const newPoints: TelemetryDataPoint[] = []
      let newChannelAdded = false

      for (const line of lines) {
        const parsed = parseTelemetryLine(line)
        if (!parsed) continue

        newPoints.push({
          timestamp: Date.now(),
          values: parsed
        })

        for (const key of Object.keys(parsed)) {
          if (!channelsRef.current.has(key)) {
            channelsRef.current.add(key)
            newChannelAdded = true
          }
        }
      }

      if (newPoints.length > 0) {
        historyRef.current = [...historyRef.current, ...newPoints].slice(-maxHistory)
        setHistory([...historyRef.current])
      }

      if (newChannelAdded) {
        setChannels(Array.from(channelsRef.current))
      }
    })

    return () => {
      unsub()
    }
  }, [maxHistory])

  const clearTelemetry = useCallback((): void => {
    historyRef.current = []
    channelsRef.current.clear()
    lineBufferRef.current = ''
    setHistory([])
    setChannels([])
  }, [])

  const exportCSV = useCallback((): void => {
    if (historyRef.current.length === 0 || channels.length === 0) return

    const header = ['timestamp_iso', 'timestamp_ms', ...channels].join(',')
    const rows = historyRef.current.map((pt) => {
      const iso = new Date(pt.timestamp).toISOString()
      const row = [iso, pt.timestamp, ...channels.map((ch) => pt.values[ch] ?? '')]
      return row.join(',')
    })

    const csvContent = [header, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `circuitforge_telemetry_${Date.now()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [channels])

  const exportJSON = useCallback((): void => {
    if (historyRef.current.length === 0) return

    const exportData = {
      exportedAt: new Date().toISOString(),
      channels,
      totalPoints: historyRef.current.length,
      data: historyRef.current
    }

    const jsonContent = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `circuitforge_telemetry_${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [channels])

  return {
    history,
    channels,
    isRecording,
    setIsRecording,
    clearTelemetry,
    exportCSV,
    exportJSON
  }
}
